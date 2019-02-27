const AWS = require('aws-sdk')
const got = require('got')
const { parse } = require('node-html-parser')
const getTemplate = require('./email')

const dynamo = new AWS.DynamoDB()
const ses = new AWS.SES()
const converter = AWS.DynamoDB.Converter

const { TABLE_NAME } = process.env

async function getPrice(url) {
  try {
    const response = await got(url)
    const parsed = parse(response.body)
    const priceSpan = parsed.querySelector('#priceblock_ourprice')
    const price = priceSpan.rawText
    return price
  } catch (e) {
    console.error('Could not find price for %s', url, e)
    return 'Unknown'
  }
}

async function updateProducts(email, products) {
  // update dynamodb with updated product information
  const safeProducts = converter.input(products)
  const updateParams = {
    Key: { email: { S: email } },
    ExpressionAttributeNames: { '#P': 'products' },
    ExpressionAttributeValues: { ':p': safeProducts },
    TableName: TABLE_NAME,
    UpdateExpression: 'SET #P = :p',
    ReturnValues: 'ALL_NEW'
  }
  const result = await dynamo.updateItem(updateParams).promise()
  const unmarshalled = converter.unmarshall(result.Attributes)
  const productLength = unmarshalled && unmarshalled.products && unmarshalled.products.length
  return productLength
}

async function emailProducts(email, token, products) {
  // send email with products table
  const htmlBody = getTemplate(email, token, products)
  const emailParams = {
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Amaxon Product Updates"
      }
    },
    Source: "Pete from Amaxon <peter.j.squicciarini@gmail.com>"
  }
  console.log('Sending email for %s', email)
  try {
    await ses.sendEmail(emailParams).promise()
    return 1
  } catch (e) {
    console.error('Could not send email:', e)
    return 0
  }
}

async function main() {
  let dbParams = {
    TableName: TABLE_NAME,
    ExpressionAttributeValues: {
      ':a': { N: '1' }
    },
    FilterExpression: 'active = :a',
    ProjectionExpression: 'email, deactivateToken, products'
  }
  try {
    const data = await dynamo.scan(dbParams).promise()
    const { Items } = data
    const batch = Items.map(async (item) => {
      const { email, deactivateToken, products } = converter.unmarshall(item)
      const promiseProducts = products.map(async (product) => {
        const lastPrice = await getPrice(product.url)
        return Object.assign(product, {
          lastPrice,
          lastCheck: Date.now()
        })
      })
      const updatedProducts = await Promise.all(promiseProducts)
      // update db with new prices
      const updateResult = await updateProducts(email, updatedProducts)
      // email user with new prices
      const emailResult = await emailProducts(email, deactivateToken, updatedProducts)
      return {
        email,
        updateResult,
        emailResult
      }
    })
    const results = await Promise.all(batch)
    console.log(JSON.stringify(results))
  } catch (e) {
    console.error(e)
  }
}

main()
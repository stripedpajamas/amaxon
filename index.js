const AWS = require('aws-sdk')
const got = require('got')
const { parse } = require('node-html-parser')
const dynamo = new AWS.DynamoDB()
const converter = AWS.DynamoDB.Converter

const { TABLE_NAME } = process.env

async function getPrice (url) {
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

async function updateProducts (email, products) {
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

async function emailProducts (email, products) {
  // send email with products table
  console.log('sending email for %s', email)
  return 1
}

async function main () {
  let dbParams = {
    TableName: TABLE_NAME,
    ProjectionExpression: 'email, products'
  }
  try {
    const data = await dynamo.scan(dbParams).promise()
    const { Items } = data
    const batch = Items.map(async (item) => {
      const { email, products } = converter.unmarshall(item)
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
      const emailResult = await emailProducts(email, updatedProducts)
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
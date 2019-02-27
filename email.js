module.exports = (email, token, products) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <title></title>
        <style>
          body {
            font-family: monospace;
          }
          .product-header {
            font-weight: bold;
          }
          .product-url {
            word-break: break-all;
          }
        </style>
    </head>
    <body>
        <table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable">
            <tr>
                <td align="left" valign="top">
                    <table border="0" cellpadding="20" cellspacing="0" width="600" id="emailContainer">
                        <tr>
                            <td align="left" valign="top">
                                <p>Hi!</p>
                                <p>Here are the updated prices for the products you are watching.</p>
                                <table border="0" cellpadding="10" cellspacing="10" width="100%" id="productsTable">
                                  <tr class="product-header">
                                    <td>Name</td>
                                    <td>URL</td>
                                    <td>Price</td>
                                  </tr>
                                  ${products.map((product) => (`
                                    <tr>
                                      <td>${product.name}</td>
                                      <td class="product-url">
                                        <a href="${product.url}">${product.url}</a>
                                      </td>
                                      <td>${product.lastPrice}</td>
                                    </tr>
                                  `))}
                                </table>
                            </td>
                        </tr>
                        <tr>
                          <td align="left" valign="top">
                            <p>To stop getting these emails click
                              <a href="https://amaxon.now.sh/deactivate?email=${email}&token=${token}">here</a>.
                            </p>
                          </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
`
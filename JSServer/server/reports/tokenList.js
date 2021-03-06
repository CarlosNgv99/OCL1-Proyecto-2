const fs = require('fs');

function generateHTMLTokens(tokenList) {
    var cont = 1;
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootswatch/4.5.2/flatly/bootstrap.min.css" integrity="sha384-qF/QmIAj5ZaYFAeQcrQ6bfVMAh4zZlrGwTPY7T/M+iTTLJqJBJjwwnsE5Y0mV7QK" crossorigin="anonymous">
        <link rel="stylesheet" href="styles/main.css">
        <title>Lista de Tokens</title>
    </head>
    <body>
        <div class="container">
        <h1>Lista de Tokens</h1>
        <table class="table table-striped">
          <thead class="thead-dark">
            <tr>
              <th scope="col">Num.</th>
              <th scope="col">Token</th>
              <th scope="col">Valor</th>
              <th scope="col">Fila</th>
              <th scope="col">Columna</th>
            </tr>
          </thead>
          <tbody>
  
              `;
  
              tokenList.forEach((item) => {
      html += "<tr>";
      html += `<td>${cont}</td>`
      html += `<td>${item.token}</td>`;
      html += `<td>${item.value}</td>`;
      html += `<td>${item.row}</td>`;
      html += `<td>${item.column}</td>`;
      html += "</tr>";
      cont++;
    });
  
    html += `
          </tbody>
                    </table>
                    </div>
              </body>
              </html>
              `;
  
    fs.writeFile("./public/tokenList.html", html, (error) => {
      if(error) {
        console.log(error);
      }
    });

  }
  
  module.exports = generateHTMLTokens;
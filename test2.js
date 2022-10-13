fetch('https://api.etherscan.io/api?module=account&action=txlist&address=0x894c3F27a6359B7d4667F9669E98E27786EB0AbF&startblock=15443506&endblock=15443506&page=1&offset=10&sort=desc&apikey=C3BG3QFC5DEIKKUTNC6QAF1J8NJA759ND9')
    .then(response => response.json())
    .then(response => {
        console.log(response);
    }).catch(console.error);
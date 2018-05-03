# cosmetic-filter

```sh
npm install cosmetic-filter
```

```js
const {FilterList} = require('cosmetic-filter')

let filterList = new FilterList()
filterList.loadEasyList()
filterList.filter(document.body, window.location.href)
```

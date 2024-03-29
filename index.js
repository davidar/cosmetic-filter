'use strict'
const adblockRust = require('adblock-rs')
const fs = require('fs')
const path = require('path')
const tldjs = require('tldjs')

const forEachR = (a, f) => { for (let i = a.length - 1; i >= 0; i--) f(a[i]) }
const removeNode = node => node.parentNode.removeChild(node)
const removeNodes = nodes => forEachR(nodes, removeNode)

class FilterList {
  constructor () {
    this.classes = new Set()
    this.ids = new Set()
    this.selectors = []
    this.domainSelectors = {}
    this.filterSet = new adblockRust.FilterSet(true)
    this.engine = new adblockRust.Engine(this.filterSet, true)
  }

  load (fname, ruleFilter = x => x) {
    const rules = fs.readFileSync(fname, 'ascii')
    for (const line of rules.split('\n')) this.addRule(ruleFilter(line))
  }

  loadEasyList (ruleFilter = x => x) {
    this.load(path.join(__dirname, 'easylist', 'easylist.txt'), ruleFilter)
    this.load(path.join(__dirname, 'easylist', 'fanboy-annoyance.txt'), ruleFilter)
  }

  addRule (line) {
    if (line) this.filterSet.addFilter(line)
    // TODO: parse exception rules
    if (!line || !line.includes('##') || line.match(/#[@?]#/)) return
    const [domains, selector] = line.split('##', 2) // cosmetic filters

    if (domains === '') { // generic filter
      if (selector.startsWith('.')) {
        this.classes.add(selector.slice(1))
      } else if (selector.startsWith('#')) {
        this.ids.add(selector.slice(1))
      } else {
        this.selectors.push(selector)
      }
      return
    }

    for (const domain of domains.split(',')) {
      if (!this.domainSelectors[domain]) this.domainSelectors[domain] = []
      this.domainSelectors[domain].push(selector)
    }
  }

  filter (body, href) {
    forEachR(body.querySelectorAll('[class]'), node => {
      if (Array.from(node.classList).some(c => this.classes.has(c))) removeNode(node)
    })

    forEachR(body.querySelectorAll('[id]'), node => {
      if (this.ids.has(node.id)) removeNode(node)
    })

    for (const selector of this.selectors) {
      try {
        removeNodes(body.querySelectorAll(selector))
      } catch (e) {
        console.error('unable to query selector:', selector)
      }
    }

    const domain = tldjs.getDomain(href)
    if (this.domainSelectors[domain]) {
      removeNodes(body.querySelectorAll(this.domainSelectors[domain].join()))
    }

    forEachR(body.getElementsByTagName('img'), image => {
      if (this.engine.check(image.src, domain, 'image', true)) removeNode(image)
    })
  }
}

module.exports = { FilterList }

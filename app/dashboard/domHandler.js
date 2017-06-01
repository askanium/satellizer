function createDom ( tag, options, children=null ) {
  let dom = document.createElement(tag);

  for (var option in options) {
    if (options.hasOwnProperty(option)) {
      dom.setAttribute(option, options[option]);
    }
  }

  if (children) {
    dom.innerHTML = children;
  }

  return dom;
}

function chartDom ( chartType, parentElem, elem=null ) {
  if ( elem === null ) {
    if ( this.domElements[chartType] === undefined ) {
      let dom = createDom('div', {class: `tile ${chartType}`});
      // let chartDom = createDom('div', {class: 'chart'});
      // dom.appendChild(chartDom);

      this.domElements[chartType] = dom;
      parentElem.appendChild(dom);
    }
    return this.domElements[chartType];
  } else {
    this.domElements[chartType] = elem;
  }
  return this;
}

function chartTitleDom ( elem, title ) {
  if ( elem.getElementsByClassName('tile-title').length ) {
    elem.getElementsByClassName('tile-title')[0].innerHTML = title;
  } else {
    let titleDom = createDom('h3', {class: 'tile-title'}, title);
    let chartDom = elem.firstChild;
    elem.insertBefore(titleDom, chartDom);
  }
}

export { chartDom, chartTitleDom, createDom };

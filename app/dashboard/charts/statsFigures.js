import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { axisLeft } from 'd3-axis';
import { transition } from 'd3-transition';
import { max } from 'd3-array';
import { createDom } from '../domHandler';
import { responsivefy } from '../utils';
import { countryLaunchesDataProcessor } from '../data_processors';


const countCountries = ( data ) => {
  let count = 0;
  data.forEach(d => {
    if ( d.total > 0 ) count += 1;
  })
  return count;
}

function statsFigures ( elem, allData, data ) {
  var styles = window.getComputedStyle(elem);
  var paddingH = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  var paddingV = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  var titleHeight = 19;  // This is the height of each tile title. It is hardcoded. // TODO make it dynamic

  var margin = {top: 18, right: 10, bottom: 0, left: 16},
      width = elem.clientWidth - margin.left - margin.right - paddingH,
      height = elem.clientHeight - margin.top - margin.bottom - paddingV- titleHeight;

  var chartDom;
  var dashboard = this;

  if ( !elem.getElementsByClassName('chart').length ) {
    chartDom = createDom('div', {class: 'chart'});
    elem.appendChild(chartDom);
  } else {
    chartDom = elem.getElementsByClassName('chart')[0];
  }

  while (chartDom.hasChildNodes()) {
      chartDom.removeChild(chartDom.firstChild);
  }

  let countryLaunches = countryLaunchesDataProcessor.call(dashboard, allData, data);
  var svg = select(chartDom)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .call(responsivefy)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  let countrySelection = svg.append('text').attr('x', 0).attr('y', 10).attr('class', 'stats-text').text('Country: -');
  let cosmodromeSelection = svg.append('text').attr('x', 0).attr('y', 30).attr('class', 'stats-text').text('Cosmodrome: -');
  let periodSelection = svg.append('text').attr('x', 0).attr('y', 50).attr('class', 'stats-text').text('Period: -');

  let removeSelectedCountry = svg.append('text')
      .attr('x', width)
      .attr('y', 10)
      .attr('class', 'stats-remove-btn')
      .on('click', () => dashboard.filters('country', null).filterData().updateCharts())
      .text('×');

  let removeSelectedCosmodrome = svg.append('text')
      .attr('x', width)
      .attr('y', 30)
      .attr('class', 'stats-remove-btn')
      .on('click', () => dashboard.filters('cosmodrome', null).filterData().updateCharts())
      .text('×');

  let removeSelectedPeriod = svg.append('text')
      .attr('x', width)
      .attr('y', 50)
      .attr('class', 'stats-remove-btn')
      .on('click', () => dashboard.brush.move(select('#launchesChart').select('.brush'), null))
      .text('×');

  let total = svg.append('text')
      .attr('x', 0)
      .attr('y', 80)
      .attr('class', 'stats-text-total')
      .text(`Total: ${data.length} sattelites in ${countCountries(countryLaunches)} countries`);


  const update = ( data ) => {
    countryLaunches = countryLaunchesDataProcessor.call(dashboard, allData, data);
    let nrOfCountries = countCountries(countryLaunches);
    total.text(`Total: ${data.length} sattelite${data.length > 1 ? 's' : ''} in ${nrOfCountries} countr${nrOfCountries > 1 ? 'ies' : 'y'}`);

    if (dashboard.dataFilters.time) {
      periodSelection.style('display', 'block').text(`Period: ${dashboard.dataFilters.time[0].toDateString().substring(4)} - ${dashboard.dataFilters.time[1].toDateString().substring(4)}`);
      removeSelectedPeriod.style('display', 'block');
    } else {
      periodSelection.style('display', 'block').text(`Period: -`);
      removeSelectedPeriod.style('display', 'none');
    }

    if (dashboard.dataFilters.country) {
      countrySelection.style('display', 'block').text(`Country: ${dashboard.dataFilters.country}`);
      removeSelectedCountry.style('display', 'block');
    } else {
      countrySelection.style('display', 'block').text(`Country: -`);
      removeSelectedCountry.style('display', 'none');
    }

    if ( dashboard.dataFilters.cosmodrome ) {
      cosmodromeSelection.style('display', 'block').text(`Cosmodrome: ${dashboard.dataFilters.cosmodrome}`);
      removeSelectedCosmodrome.style('display', 'block');
    } else {
      cosmodromeSelection.style('display', 'block').text(`Cosmodrome: -`);
      removeSelectedCosmodrome.style('display', 'none');
    }
  };

  return {
    update
  };
}

export default statsFigures;

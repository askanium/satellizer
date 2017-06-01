import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { axisLeft } from 'd3-axis';
import { transition } from 'd3-transition';
import { max } from 'd3-array';
import { createDom } from '../domHandler';
import { responsivefy } from '../utils';
import { countryLaunchesDataProcessor } from '../data_processors';


function countriesBarChart ( elem, allData, selectedData, launchingPlaces, chartOrder ) {
  var styles = window.getComputedStyle(elem);
  var paddingH = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  var paddingV = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  var titleHeight = 19;  // This is the height of each tile title. It is hardcoded. // TODO make it dynamic

  var margin = {top: 10, right: 40, bottom: 0, left: 100},
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

  var y = scaleBand()
      .padding(.1)
      .range([0, height]);

  var x = scaleLinear()
      .range([0, width]);

  var yAxis = axisLeft(y);

  var svg = select(chartDom)
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .call(responsivefy)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  let completeChartData = countryLaunchesDataProcessor.call(dashboard, allData, selectedData);
  let chartData;

  let middle = Math.ceil(completeChartData.length / 2);
  if ( chartOrder === 1 ) {
    chartData = completeChartData.slice(0, middle);
  } else {
    chartData = completeChartData.slice(middle);
  }

  dashboard.countryLaunches = completeChartData;

  x.domain([0, max(completeChartData, d => d.total)]);
  y.domain(chartData.map(d => d.country));

  var usesBars = svg.selectAll(".uses-bars")
      .data(chartData)
      .enter().append("g")
      .attr("class", "g")
      .attr("transform", d => "translate(0," + y(d.country) + ")")

  let launchesBars = usesBars
      .selectAll('rect')
      .data(d => d.launches)
      .enter()
      .append('rect')
        .attr('x', d => x(d.x0))
        .attr('y', d => y(d.country))
        .attr('width', d => x(d.x1) - x(d.x0))
        .attr('height', y.bandwidth())
        .style('fill', d => d.use.indexOf('/') > -1 ? `url(#${d.use}-bar)` : dashboard.colors[d.use])

  let launchesBarLabels = usesBars
      .append('text')
        .attr('class', 'bar-chart-label')
        .attr('x', d => x(d.total) + 3)
        .attr('y', d => y.bandwidth() / 2)
        .attr('dy', '.35em')
        .text(d => d.total);

  // The left axis with the names of Lauching Places
  let leftAxis = svg.append('g')
      .attr('class', 'g-y-axis')
      .call(yAxis);

  leftAxis.selectAll('line').style('display', 'none');
  leftAxis.selectAll('path').style('display', 'none');


  const update = ( selectedData ) => {
    let t = transition().duration(500);
    completeChartData = countryLaunchesDataProcessor.call(dashboard, allData, selectedData);
    
    let middle = Math.ceil(completeChartData.length / 2);
    if ( chartOrder === 1 ) {
      chartData = completeChartData.slice(0, middle);
    } else {
      chartData = completeChartData.slice(middle);
    }

    x.domain([0, max(completeChartData, d => d.total)]);
    y.domain(chartData.map(d => d.country));

    yAxis = axisLeft(y);

    usesBars
      .data(chartData)
      .selectAll('rect')
      .data(d => d.launches)
        .transition(t)
        .attr('width', d => x(d.x1) - x(d.x0))
        .attr('x', d => x(d.x0))
        .style('fill', d => d.use.indexOf('/') > -1 ? `url(#${d.use}-bar)` : dashboard.colors[d.use]);

    launchesBarLabels
      .data(chartData)
        .transition(t)
        .attr('x', d => x(d.total) + 3)
        .text(d => d.total);

    leftAxis.call(yAxis);
    leftAxis.selectAll('line').style('display', 'none');
  };

  return {
    update
  };
}

export default countriesBarChart;

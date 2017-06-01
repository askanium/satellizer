import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { axisLeft } from 'd3-axis';
import { transition } from 'd3-transition';
import { max } from 'd3-array';
import { createDom } from '../domHandler';
import { responsivefy } from '../utils';


const generateEmptyUsesObj = () => { return {'Government': 0,'Commercial': 0,'Military': 0,'Civil': 0}; }

const getProcessedData = ( data ) => {
  let usesGroups = generateEmptyUsesObj();

  data.forEach(d => {
    // usesGroups[d.Users.split('/')[0]] += 1;
    d.Users.split('/').forEach(use => {
      usesGroups[use] += 1;
    })
  });

  let processedData = Object.keys(usesGroups).map(use => { return {use: use, satellites: usesGroups[use]}; });
  processedData.sort((a, b) => b.satellites - a.satellites);

  return processedData;
}


function usesBarChart ( elem, data ) {
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

  var chartData = getProcessedData(data);

  x.domain([0, max(chartData, d => d.satellites)]);
  y.domain(chartData.map(d => d.use));

  var usesBars = svg.selectAll(".uses-bars")
      .data(chartData)
      .enter().append("g")
      .attr("class", "g")
      .attr("transform", d => "translate(0," + y(d.use) + ")")

  var rects = usesBars
      .append('rect')
        .attr("height", y.bandwidth())
        .attr("x", d => x(0))
        .attr("width", d => x(d.satellites))
        .style("fill", d => dashboard.colors[d.use]);

  var labels = usesBars
      .append('text')
        .attr('class', 'bar-chart-label')
        .attr('x', d => x(d.satellites) + 3)
        .attr('y', d => y.bandwidth() / 2)
        .attr('dy', '.35em')
        .text(d => d.satellites);

  // The left axis with the names of Lauching Places
  let leftAxis = svg.append('g')
      .attr('class', 'g-y-axis')
      .call(yAxis);

  leftAxis.selectAll('line').style('display', 'none');
  leftAxis.selectAll('path').style('display', 'none');


  const update = (data) => {
    let t = transition().duration(500);
    chartData = getProcessedData(data);

    x.domain([0, max(chartData, d => d.satellites)]);
    y.domain(chartData.map(d => d.use));

    yAxis = axisLeft(y);

    rects
        .data(chartData)
          .transition(t)
          .attr("width", d => x(d.satellites))
          .style("fill", d => dashboard.colors[d.use]);

    labels
        .data(chartData)
          .transition(t)
          .attr('x', d => x(d.satellites) + 3)
          .text(d => d.satellites)

    leftAxis.call(yAxis);
  };

  return {
    update
  };
}

export default usesBarChart;

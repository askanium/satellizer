import { extent, max, min, scan } from 'd3-array';
import { scaleLinear, scaleTime, scaleBand } from 'd3-scale';
import { line, area, curveCardinal } from 'd3-shape';
import { axisLeft, axisBottom } from 'd3-axis';
import { select, selectAll, event } from 'd3-selection';
import { brushX, brushSelection } from 'd3-brush';
import { transition } from 'd3-transition';
import { createDom } from '../domHandler';
import { responsivefy } from '../utils';
import { countLaunchesByLaunchingPlace, prepareLaunchesBarChartData } from '../data_processors';

const getBrushableAreaData = (data, dashboard, minDate, maxDate) => {
  // Count total launches by month, required to draw the brushable area below the main chart.
  var totalLaunches = {};
  let date = minDate;

  // Populate totalLaunches with dates for the whole interval between minDate and maxDate
  while (date <= maxDate) {
    totalLaunches[date] = 0;
    date = new Date(date.getFullYear(), date.getMonth() + 1, 15);
  }

  let selectedData = dashboard.filterData(true, false);

  selectedData.forEach(d => {
    totalLaunches[d.normalizedDate] += 1;
  });

  var brushableAreaData = Object.keys(totalLaunches).map(key => { return {date: new Date(key), launches: totalLaunches[key]} });
  brushableAreaData.sort((a, b) => a.date.getTime() - b.date.getTime());
  brushableAreaData.unshift({date: minDate, launches: 0});
  brushableAreaData.push({date: maxDate, launches: brushableAreaData[brushableAreaData.length - 1].launches / 2});

  return brushableAreaData;
}


/**
 * Draw one launchesChart in the provided element with the provided data.
 * @param {DOM} elem - The DOM element in which to draw the launchesChart.
 * @param {Object[]} data - The data to use in the launchesChart.
 */
function launchesChart ( elem, data, launchingPlaces ) {
  var styles = window.getComputedStyle(elem);
  var paddingH = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  var paddingV = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  var titleHeight = 19;  // This is the height of each tile title. It is hardcoded. // TODO make it dynamic
  var bottomAxisHeight = 15;

  var margin = {top: 20, right: 200, bottom: 50, left: 180},
      width = elem.offsetWidth - margin.left - margin.right - paddingH,
      height = elem.offsetHeight - margin.top - margin.bottom - paddingV - titleHeight - bottomAxisHeight;

  var chartDom;

  if ( !elem.getElementsByClassName('chart').length ) {
    chartDom = createDom('div', {class: 'chart', id: 'launchesChart'});  // Id needed for utils.responsivefy
    elem.appendChild(chartDom);
  } else {
    chartDom = elem.getElementsByClassName('chart')[0];
  }

  while (chartDom.hasChildNodes()) {
      chartDom.removeChild(chartDom.firstChild);
  }

  var dashboard = this;

  // Data related to x scaleTime axis.
  let today = new Date();
  let minDate = min(data, d => d.Date);
  let maxDate = max(data, d => d.Date);
  minDate = new Date(minDate.getFullYear(), 0, 1);
  maxDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 28);

  // Create separate datapoints to draw the lines along which all satelites will be visualized.
  let linesData = [];
  let placeToLineMapper = {};
  for (let i = 0; i < launchingPlaces.length; i++) {
    placeToLineMapper[launchingPlaces[i].place] = i;

    let levelData = {style: 'solid', data: []};
    levelData.data.push({level: i, date: minDate});
    levelData.data.push({level: i, date: maxDate});
    linesData.push(levelData);
  }

  // Count total launches by month, required to draw the brushable area below the main chart.
  var brushableAreaData = getBrushableAreaData(data, dashboard, minDate, maxDate);
  var barChartData = prepareLaunchesBarChartData(launchingPlaces);

  var x = scaleTime()
      .range([0, width])
      .domain([minDate, maxDate]);
  
  var y = scaleLinear()
      .range([0, height])
      .domain([-.5, launchingPlaces.length - .5]);

  var barChartX = scaleLinear()
      .range([width+5, width + margin.right - 20])
      .domain([0, 200]);

  var barChartY = scaleBand()
      .range([0, height])
      .domain(launchingPlaces.map(item => item.place))
      .padding(.2);

  var brushChartX = scaleTime()
      .range([0, width])
      .domain([minDate, maxDate]);
  
  var brushChartY = scaleLinear()
      .range([height + margin.bottom, height])
      .domain([0, max(brushableAreaData, d => d.launches)]);

  var yAxis = axisLeft(barChartY);
  var xAxis = axisBottom(brushChartX).tickSize(1);

  var line_ = line()
      .x(d => x(d.date))
      .y(d => y(d.level));

  var area_ = area()
      .x(d => brushChartX(d.date))
      .y0(brushChartY(0))
      .y1(d => brushChartY(d.launches))
      .curve(curveCardinal);


  // Main SVG
  var svg = select(chartDom).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom + bottomAxisHeight)
      .call(responsivefy)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');


  // Time frame chart
  var timeFrameGroup = svg.append('g').attr('class', 'g-timeframe');

  var timeFrameSvg = timeFrameGroup.append("svg")
      .attr("width", width)
      .attr("height", height)
      .append('g')
      .attr('transform', 'translate(0,0)');

  // Add a transparent rect to catch the mousemove event for displaying time at mouse pointer.
  timeFrameSvg.append('rect').attr('x', 0).attr('y', 0).attr('width', width).attr('height', height).style('opacity', 0);

  var lines = timeFrameSvg.selectAll('.g-launchpad')
      .data(linesData)
      .enter()
      .append('g')
        .attr("class", "g-launchpad");

  lines.append('path')
      .attr('class', d => `launchpad-${d.style}`)
      .attr('d', d => line_(d.data))
      .style('fill-opacity', .9);

  let satellites = timeFrameSvg.append('g')
      .attr('class', 'g-satellites')
    .selectAll('.satellite')
    .data(data)
    .enter()
    .append('circle')
      .attr('class', d => `satellite`)
      .attr('cx', d => { 
        let xOffset = 0;
        if ( d.angle ) {
          xOffset = Math.cos((d.angle - 90) * Math.PI / 180) * (d.size < 5 ? 7 : 5) * d.offset;
        } 
        return x(d.Date) + xOffset;
      })
      .attr('cy', d => {
        let yOffset = 0;
        if ( d.angle ) {
          yOffset = Math.sin((d.angle - 90) * Math.PI / 180) * (d.size < 5 ? 7 : 5) * d.offset;
        }
        return y(placeToLineMapper[d['Launch Site']]) + yOffset;
      })
      .attr('r', d => d.size)
      .attr('fill', d => (d.Users.indexOf('/') > -1 ? `url(#${d.Users})` : dashboard.colors[d.Users]))
      .attr('data-name', d => d['Current Official Name of Satellite'])
      .attr('data-date', d => d.Date);


  // Brushable chart
  let brushableChartGroup = svg.append('g').attr('class', 'g-brushable');

  let launchesByMonthArea = brushableChartGroup.selectAll('.launches-by-month')
      .data([brushableAreaData])
      .enter()
      .append('path')
        .attr('class', 'launches-by-month')
        .attr('d', d => area_(d));

  let bottomAxis = svg.append('g')
      .attr('class', 'g-x-axis')
        .attr('transform', `translate(0, ${height + margin.bottom})`)
        .call(xAxis);
  bottomAxis.selectAll('line').style('display', 'none');
  bottomAxis.selectAll('path').style('display', 'none');


  // The bar chart on the right side of the launches time series that denotes the overall amount of
  // launched satellites on any given Launching Site.
  let launchesGroup = svg.append('g')
      .attr('class', 'launches-bars');

  let launchesBars = launchesGroup.selectAll('.launch-bar')
      .data(barChartData)
      .enter()
      .append('g')
        .attr('class', 'launch-bar')
      .selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
        .attr('x', d => barChartX(d.x0))
        .attr('y', d => barChartY(d.place))
        .attr('width', d => barChartX(d.x1) - barChartX(d.x0))
        .attr('height', barChartY.bandwidth())
        .style('fill', d => d.use.indexOf('/') > -1 ? `url(#${d.use}-bar)` : dashboard.colors[d.use])
        // .style('opacity', .8)
      .on('mouseover', function(d) {
        leftAxis.selectAll('text')
            .filter(function(){ return select(this).text() == d.place; })
            .style('font-weight', '700');
      })
      .on('mouseout', function(d) {
        leftAxis.selectAll('text')
            .filter(function(){ return select(this).text() == d.place; })
            .style('font-weight', '400');
      })
      .on('click', function(d) {
        dashboard.filters('cosmodrome', d.place).filterData().updateCharts();
      });

  let launchesBarLabels = launchesGroup.selectAll('text')
      .data(launchingPlaces)
      .enter()
      .append('text')
        .attr('class', 'bar-chart-label')
        .attr('x', d => barChartX(d.launches) + 3)
        .attr('y', d => barChartY(d.place) + barChartY.bandwidth() / 2)
        .attr('dy', '.35em')
        .text(d => d.launches);

  launchesGroup.append('text')
      .attr('x', width + 5)
      .attr('y', -6)
      .attr('dy', '.35em')
      .attr('class', 'explanation-text')
      .text('Total launches per use per site');
  

  // The left axis with the names of Lauching Places
  let leftAxis = svg.append('g')
      .attr('class', 'g-y-axis')
      .call(yAxis);

  leftAxis.selectAll('line').style('display', 'none');
  leftAxis.selectAll('path').style('display', 'none');


  // The Uses filters group in the bottom left corner of the chart.
  var filtersGroup = svg.append('g').attr('class', 'g-filters').attr('transform', `translate(${width/2 - 100}, 10)`);

  var filtersData = [
    {use: 'Civil', x: 0, y: -25, color: dashboard.colors['Civil']},
    {use: 'Commercial', x: 60, y: -25, color: dashboard.colors['Commercial']},
    {use: 'Military', x: 166, y: -25, color: dashboard.colors['Military']},
    {use: 'Government', x: 244, y: -25, color: dashboard.colors['Government']},
  ];

  let filters = filtersGroup.selectAll('.uses-filters')
      .data(filtersData)
      .enter()
      .append('g')
        .attr('class', 'uses-filters')
        .style('cursor', 'pointer')
      .on('click', function (d) {
        let circle = select(this).select('circle');
        let oldFillOpacity = circle.style('fill-opacity');
        let newFillOpacity = (oldFillOpacity == 0 ? 1 : 0);
        circle.style('fill-opacity', newFillOpacity);

        dashboard.filters('uses', d.use).filterData().updateCharts();
      });

  let filterCircles = filters.append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', '5')
      .style('fill', d => d.color)
      .style('stroke', d => d.color)
      .style('opacity', .8);

  let filterText = filters.append('text')
      .attr('x', d => d.x + 10)
      .attr('y', d => d.y)
      .attr('dy', '.35em')
      .style('font-size', '13px')
      .style('font-family', 'Maven Pro')
      .style('fill', '#444')
      .text(d => d.use);

  filtersGroup.append('text')
      .attr('class', 'explanation-text')
      .attr('x', -120)
      .attr('y', -25)
      .attr('dy', '.35em')
      .text('Uses (clickable):');

  // Size legend
  let sizeLegendGroup = svg.append('g').attr('class', 'g-size-legend').attr('transform', `translate(-30, ${height + 10})`);
  let sizeLegendData = [
    {x: 0, y: 0, radius: 3, text: 'Satellite mass:    1–50 kg'},
    {x: 0, y: 13, radius: 4, text: '50–500 kg'},
    {x: 0, y: 26, radius: 5, text: '500–5000 kg'},
    {x: 0, y: 39, radius: 6, text: '5000+ kg'}
  ];

  let sizes = sizeLegendGroup.selectAll('.size-legend')
      .data(sizeLegendData)
      .enter()
      .append('g')
        .attr('class', 'size-legend');

  let sizesCircles = sizes.append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.radius)
      .style('fill', d => dashboard.colors.mapHighlight);

  let sizesText = sizes.append('text')
      .attr('x', d => d.x - 10)
      .attr('y', d => d.y)
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('font-family', 'Maven Pro')
      .style('fill', '#444')
      .style('text-anchor', 'end')
      .text(d => d.text);


  // Vertical line that shows exact time on mouseover chart
  let timeLineIndicator = timeFrameSvg
      .append('line')
        .attr('class', 'time-indicator')
        .attr('x1', -100)
        .attr('x2', -100)
        .attr('y1', height)
        .attr('y2', 0);

  let timeLineLabel = timeFrameSvg
      .append('g')
        .attr('transform', `translate(-1000,${height})`);

  timeLineLabel
      .append('text')
          .attr('x', 5)
          .attr('y', -2)
          .attr('class', 'time-label-text');

  timeFrameGroup
      .on('mousemove', () => {
        let xTextPosition = 5;
        let xTextAnchor = 'start';
        if ( event.pageX + timeLineLabel.select('text').node().getBoundingClientRect().width > margin.left + width ) {
          xTextPosition = -5;
          xTextAnchor = 'end';
        }
        timeLineIndicator.attr('x1', event.pageX - margin.left);
        timeLineIndicator.attr('x2', event.pageX - margin.left);
        timeLineLabel.attr('transform', `translate(${event.pageX - margin.left},${height})`);
        timeLineLabel.select('text')
            .attr('x', xTextPosition)
            .style('text-anchor', xTextAnchor)
            .text(x.invert(event.pageX - margin.left).toDateString().substring(4));
      })
      .on('mouseout', () => {
        timeLineIndicator.attr('x1', -100);
        timeLineIndicator.attr('x2', -100);
        timeLineLabel.attr('transform', `translate(-1000,${height})`);
      });

  // Explanation text
  svg.append('text')
      .attr('x', width + 5)
      .attr('y', height + 45)
      .attr('dy', '.35em')
      .attr('class', 'explanation-text')
      .text('< Total launches in time');


  // d3 brush
  dashboard.brush = brushX()
      .extent([[0, height], [width, height + margin.bottom]])
      .on('brush', () => {
        var selection = event.selection || brushChartX.range();
          
        startSelectionLabel.attr('x', selection[0] - 2)
          .text(brushChartX.invert(selection[0]).toDateString().substring(4));
        endSelectionLabel.attr('x', selection[1] + 2)
          .text(brushChartX.invert(selection[1]).toDateString().substring(4));

        if ( selection[0] == x.range()[0] && selection[1] == x.range()[1] ) {
          startSelectionLabel.attr('x', -1000);
          endSelectionLabel.attr('x', -1000);
        } else {
          startSelectionLabel.attr('x', selection[0] - 2);
          endSelectionLabel.attr('x', selection[1] + 2);
        }

        //Reset the offsets of the gradient
        linearGradient.selectAll(".left").attr("offset", (selection[0] + 2) / width * 100 + "%");
        linearGradient.selectAll(".right").attr("offset",  (selection[1] + 2) / width * 100 + "%");

      })
      .on("end", () => {
        var selection = event.selection || brushChartX.range();

        x.domain([brushChartX.invert(selection[0]), brushChartX.invert(selection[1])]);
          
        startSelectionLabel.attr('x', selection[0] - 2)
          .text(brushChartX.invert(selection[0]).toDateString().substring(4));
        endSelectionLabel.attr('x', selection[1] + 2)
          .text(brushChartX.invert(selection[1]).toDateString().substring(4));


        if ( selection[0] == x.range()[0] && selection[1] == x.range()[1] ) {
          startSelectionLabel.attr('x', -1000);
          endSelectionLabel.attr('x', -1000);
        } else {
          startSelectionLabel.attr('x', selection[0] - 2);
          endSelectionLabel.attr('x', selection[1] + 2);
        }

        //Reset the offsets of the gradient
        linearGradient.selectAll(".left").attr("offset", (selection[0] + 2) / width * 100 + "%");
        linearGradient.selectAll(".right").attr("offset",  (selection[1] + 2) / width * 100 + "%");

        dashboard
          .filters('time', (event.selection ? selection.map(s => brushChartX.invert(s)) : null))
          .filterData()
          .updateCharts();
      });

  svg.append('g')
      .attr('class', 'brush')
      .call(dashboard.brush);

  var startSelectionLabel = brushableChartGroup.append('text')
      .attr('x', -1000)
      .attr('y', brushChartY(margin.bottom - 15))
      .attr('class', 'selection-brush-label')
      .style('text-anchor', 'end')
      .text('0%');

  var endSelectionLabel = brushableChartGroup.append('text')
      .attr('x', -1000)
      .attr('y', brushChartY(margin.bottom - 15))
      .attr('class', 'selection-brush-label')
      .text('0%');


  // Gradient definition for brushable area
  var linearGradient = svg.append("defs").append("linearGradient")
    .attr("id", "brushable-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

  //First stop to fill the region between 0% and 40%
  linearGradient.append("stop")
    .attr("class", "left")  //useful later when we want to update the offset
    .attr("offset", "0%")
    .attr("stop-color", "#D6D6D6") //grey
    .attr("stop-opacity", 0.5);
  //Second stop to fill the region between 40% and 100%
  linearGradient.append("stop")
    .attr("class", "left")  //useful later when we want to update the offset
    .attr("offset", "0%")
    .attr("stop-color", dashboard.colors.mapHighlight) //purple-pink
    .attr("stop-opacity", 1);

  //Third stop to get the same color from 40% to 60%
  linearGradient.append("stop")
    .attr("class", "right") //useful later when we want to update the offset
    .attr("offset", "100%")
    .attr("stop-color", dashboard.colors.mapHighlight) //purple-pink
    .attr("stop-opacity", 1);
  //Fourth stop to fill the region between 60% and 100%
  linearGradient.append("stop")
    .attr("class", "right") //useful later when we want to update the offset
    .attr("offset", "100%")
    .attr("stop-color", "#D6D6D6") //grey
    .attr("stop-opacity", 0.5);

  svg.select('.launches-by-month')
    .style("fill", "url(#brushable-gradient)");


  const update = ( selectedData ) => {
    let barData = countLaunchesByLaunchingPlace(selectedData, launchingPlaces);
    let processedBarData = prepareLaunchesBarChartData(barData);
    let ids = selectedData.map(d => d.NORADNumber);
    let maxNrOfLaunches = 0;
    let brushableAreaData = getBrushableAreaData(dashboard.data, dashboard, minDate, maxDate);
    let t = transition().duration(500);

    barData.forEach(d => {
      if (d.launches > maxNrOfLaunches) {
        maxNrOfLaunches = d.launches;
      }
    });

    barChartX.domain([0, maxNrOfLaunches * 1.15]);
    // brushChartY.domain([0, max(brushableAreaData, d => d.launches)]);

    launchesGroup.selectAll('.launch-bar')
      .data(processedBarData)
      .selectAll('rect')
      .data(d => d)
        .transition(t)
        .attr('width', d => barChartX(d.x1) - barChartX(d.x0))
        .attr('x', d => barChartX(d.x0))
        .style('fill', d => d.use.indexOf('/') > -1 ? `url(#${d.use}-bar)` : dashboard.colors[d.use]);

    launchesGroup.selectAll('text')
      .data(launchingPlaces)
        .transition(t)
        .attr('x', d => barChartX(d.launches) + 3)
        .text(d => d.launches);

    satellites
      .filter(d => ids.indexOf(d.NORADNumber) > -1)
        .transition(t)
        .attr('cx', d => { 
          let xOffset = 0;
          if ( d.angle ) {
            xOffset = Math.cos((d.angle - 90) * Math.PI / 180) * (d.size < 5 ? 7 : 5) * d.offset;
          } 
          return x(d.Date) + xOffset;
        })
        .attr('cy', d => {
          let yOffset = 0;
          if ( d.angle ) {
            yOffset = Math.sin((d.angle - 90) * Math.PI / 180) * (d.size < 5 ? 7 : 5) * d.offset;
          }
          return y(placeToLineMapper[d['Launch Site']]) + yOffset;
        })
        .attr('r', d => d.size);

    satellites
      .filter(d => ids.indexOf(d.NORADNumber) === -1)
        .transition(t)
        .attr('cx', d => x(d.Date))
        .attr('r', 0);

    launchesByMonthArea
      .data([brushableAreaData])
        .transition(t)
        .attr('d', d => area_(d))

  };

  return { 
    update
  };
}

export default launchesChart;

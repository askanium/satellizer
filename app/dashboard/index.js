import {
  launchesChart,
  worldMap,
  usesBarChart,
  countriesBarChart,
  statsFigures
} from './charts';
import {
  chartDom,
  createDom,
  chartTitleDom
} from './domHandler';
import {
  launchesDataProcessor
} from './data_processors';
import {
  colorMode1,
  colorMode2
} from './constants';
import { select } from 'd3-selection';
import { json } from 'd3';

class Dashboard {
  constructor ( elem ) {
    this.rootDom = elem;
    this.width = Math.floor(elem.getBoundingClientRect());
    
    this.colors = colorMode1;
    
    this.domElements = {};

    this.dataFilters = {
      time: null,
      excludedUses: [],
      country: null,
      cosmodrome: null
    }
    
    this.charts = {};
    this.chartTypes = ['launches', 'map', 'uses', 'countries1', 'countries2', 'stats'];

    this.chartTitles = {
      launches: 'Satellite launches and expected lifetimes',
      map: 'The geography of satellite launches',
      uses: 'Cummulative uses',
      countries1: 'Launches by country',
      stats: 'Selection stats'
    };

    // Required for memoization of processed data.
    this.flags = {};
  }

  data ( rawData ) {
    this.data = rawData;
    this.launchingPlaces = launchesDataProcessor(this.data);
    this.filterData();
    return this;
  }

  _setDomLayout () {
    let dom = createDom('div', {class: 'line-pane'});
    this.domElements['line-pane'] = dom;
    this.setParent(dom, this.rootDom);

    dom = createDom('div', {class: 'map-pane'});
    this.domElements['map-pane'] = dom;
    this.setParent(dom, this.rootDom);

    dom = createDom('div', {class: 'details-pane'});
    this.domElements['details-pane'] = dom;
    this.setParent(dom, this.rootDom);

    return this;
  }

  offsetOverlappingLaunches ( data ) {
    let overlappingLaunches = 0;
    let prevLaunchDate = new Date();
    let prevLaunchSite = '';
    let startIdx = 0;
    let endIdx = 0;
    let firstLevelSatellites = 8;
    let secondLevelSatellites = 12;
    let thirdLevelSatellites = 16;
    let offset;
    let nrOfSatellitesOnLvl;

    for (let i = 0; i < data.length; i++ ) {
      delete data[i].angle;
      if ( prevLaunchDate.getTime() !== data[i].Date.getTime() || prevLaunchSite !== data[i]['Launch Site'] ) {
        if ( overlappingLaunches > 1 ) {
          endIdx = i;
          for ( let j = startIdx; j < endIdx; j++ ) {
            if ( j - startIdx < firstLevelSatellites ) {
              nrOfSatellitesOnLvl = overlappingLaunches > firstLevelSatellites 
                  ? firstLevelSatellites 
                  : overlappingLaunches;
              offset = .5;
            } else if ( j - startIdx < firstLevelSatellites + secondLevelSatellites ) {
              nrOfSatellitesOnLvl = overlappingLaunches > firstLevelSatellites + secondLevelSatellites 
                  ? secondLevelSatellites 
                  : overlappingLaunches - firstLevelSatellites;
              offset = 1;
            } else {
              nrOfSatellitesOnLvl = overlappingLaunches - firstLevelSatellites - secondLevelSatellites;
              offset = 1.5;
            }
            data[j].offset = offset;
            data[j].angle = 360 / nrOfSatellitesOnLvl * (j - startIdx + 1);
          }
        }
        startIdx = i;
        overlappingLaunches = 1;
      } else {
        overlappingLaunches += 1;
      }
      prevLaunchDate = data[i].Date;
      prevLaunchSite = data[i]['Launch Site'];
    }
  }

  filters (type, filter) {
    if ( type === 'time' ) {
      this.dataFilters[type] = filter;
    } else if ( type === 'uses' ) {
      if ( this.dataFilters.excludedUses.indexOf(filter) > -1 ) {
        this.dataFilters.excludedUses = this.dataFilters.excludedUses.filter(d => d != filter);
      } else {
        this.dataFilters.excludedUses.push(filter);
      }
    } else if ( type === 'country' ) {
      let f = (filter === this.dataFilters.country ? null : filter);
      this.dataFilters.country = f;
      // this.dataFilters.cosmodrome = null;
    } else if ( type === 'cosmodrome' ) {
      let f = (filter === this.dataFilters.cosmodrome ? null : filter);
      this.dataFilters.cosmodrome = f;
      // this.dataFilters.country = null;
    }
    return this;
  }

  filterData (skipTimeFilter=false, assignResultToDashboard=true) {
    let timeFilteredData = [];
    let cosmodromeFilteredData = [];
    let countryFilteredData = [];
    let usesFilteredData = [];
    if ( this.dataFilters.time && !skipTimeFilter ) {
      for (let i = 0; i < this.data.length; i++) {
        if (this.data[i].Date > this.dataFilters.time[0] && this.data[i].Date < this.dataFilters.time[1]) {
          timeFilteredData.push(this.data[i]);
        }
      }
    } else {
      timeFilteredData = this.data;
    }

    if ( this.dataFilters.country ) {
      for (let i = 0; i < timeFilteredData.length; i++) {
        if ( timeFilteredData[i]['Country of Operator/Owner'].indexOf(this.dataFilters.country) > -1 ) {
          countryFilteredData.push(timeFilteredData[i]);
        }
      }
    } else {
      countryFilteredData = timeFilteredData;
    }

    if ( this.dataFilters.cosmodrome ) {
      for (let i = 0; i < countryFilteredData.length; i++) {
        if ( countryFilteredData[i]['Launch Site'] === this.dataFilters.cosmodrome ) {
          cosmodromeFilteredData.push(countryFilteredData[i]);
        }
      }
    } else {
      cosmodromeFilteredData = countryFilteredData;
    }    

    if ( this.dataFilters.excludedUses.length ) {
      this.dataFilters.excludedUses.sort();

      cosmodromeFilteredData.forEach(d => {
        let dUsesToCompare = d.Users.split('/');
        let foundUses = 0;
        dUsesToCompare.forEach(use => {
          if ( this.dataFilters.excludedUses.indexOf(use) > -1 ) {
            foundUses += 1;
          }
        });
        if (foundUses < dUsesToCompare.length) {
            usesFilteredData.push(d);
        }
      })
    } else {
      usesFilteredData = cosmodromeFilteredData;
    }

    this.offsetOverlappingLaunches(usesFilteredData);

    // Reset flags, so that the next time launches by country will be recomputed.
    this.flags.sortedByCountry = false;

    if ( assignResultToDashboard ) {
      this.selectedData = usesFilteredData;
      return this;
    } else {
      return usesFilteredData;
    }

  }

  toggleColorMode () {
    this.colors = (this.colors == colorMode1) ? colorMode2 : colorMode1;
    this.updateCharts();
  }

  chartElement ( elemType, chartType, parent, elem ) {
    return chartDom.call(this, elemType, chartType, parent, elem);
  }

  setParent( elem, parentElem ) {
    parentElem.appendChild(elem);
    return this;
  }

  getChartTileDom ( chartType, paneType ) {
    let chartDom = this.domElements[chartType] || createDom('div', {class: `tile ${chartType}`});
    this.setParent(chartDom, this.domElements[paneType]);
    this.domElements[chartType] = chartDom;

    return chartDom;
  }

  drawLineChart () {
    let lineChartDom = this.getChartTileDom('launches', 'line-pane');
    this.charts.launches = launchesChart.call(this, lineChartDom, this.data, this.launchingPlaces);

    return this;
  }

  drawUsesBarChart () {
    let usesBarChartDom = this.getChartTileDom('uses', 'details-pane');
    this.charts.uses = usesBarChart.call(this, usesBarChartDom, this.selectedData);

    return this;
  }

  drawStatsChart () {
    let statsTileDom = this.getChartTileDom('stats', 'details-pane');
    this.charts.stats = statsFigures.call(this, statsTileDom, this.data, this.selectedData);

    return this;
  }

  drawWorldMap () {
    let worldMapDom = this.getChartTileDom('map', 'map-pane');
    this.charts.map = worldMap.call(this, worldMapDom, this.selectedData, this.launchingPlaces);

    return this;
  }

  drawCountriesBarChart () {
    let countriesBarChartDom1 = this.getChartTileDom('countries1', 'details-pane');
    let countriesBarChartDom2 = this.getChartTileDom('countries2', 'details-pane');
    this.charts.countries1 = countriesBarChart.call(this, countriesBarChartDom1, this.data, this.selectedData, this.launchingPlaces, 1);
    this.charts.countries2 = countriesBarChart.call(this, countriesBarChartDom2, this.data, this.selectedData, this.launchingPlaces, 2);

    return this;
  }

  updateChart ( chartType ) {
    this.charts[chartType].update(this.selectedData);

    return this;
  }

  updateChartTitle ( chartType ) {
    chartTitleDom(this.domElements[chartType], this.chartTitles[chartType]);
    return this;
  }

  draw () {
    this._setDomLayout()
        .drawWorldMap().updateChartTitle('map')
        .drawStatsChart().updateChartTitle('stats')
        .drawUsesBarChart().updateChartTitle('uses')
        .drawCountriesBarChart().updateChartTitle('countries1')
        .drawLineChart().updateChartTitle('launches')
        // .drawHistogramChart('n').updateChartTitle('n-histogram')
        // .drawHistogramChart('p').updateChartTitle('p-histogram')
        // .drawEmotionsCanvasChart().updateChartTitle('emotions');

    // this.createControls();
    // window.dispatchEvent(new Event('resize'));
  }

  updateCharts () {
    this.chartTypes.forEach(chart => this.updateChart(chart))
  }
}

export default Dashboard;

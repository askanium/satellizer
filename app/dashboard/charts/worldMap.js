import { arc, pie } from 'd3-shape';
import { select, selectAll, event } from 'd3-selection';
import { transition } from 'd3-transition';
import { createDom } from '../domHandler';
import { responsivefy } from '../utils';
import { interpolate } from 'd3';
import { countryCodes, cosmodromes } from '../constants';
import { countLaunchesByLaunchingPlace } from '../data_processors';
import Datamap from 'datamaps/dist/datamaps.world';


function handleMarkers (layer, data, options ) {
  var self = this,
      fillData = this.options.fills,
      svg = this.svg;

  if ( !data || (data && !data.slice) ) {
    throw "Datamaps Error - markers must be an array";
  }

  var markers = layer.selectAll('g.datamaps-marker').data( data, JSON.stringify );

  markers
    .enter()
      .append('g')
        .attr('class', 'datamaps-marker')
        .attr('transform', datum => {
          var latLng;
          let x, y;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) x = latLng[0] - 12;

          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) y = latLng[1] - 28;
          return `translate(${x},${y})`;
        })
      .append('path')
        .attr('class', 'launch-site')
        .attr('d', 'M298.399,208.739c-0.052-7.311-4.99-16.004-11.242-19.792l-16.658-10.092l-0.309-0.172c-0.249-0.127-0.363-0.229-0.372-0.233c-0.085-0.19-0.089-0.841-0.091-1.23c-0.001-0.293-0.004-0.437-0.015-0.681C265.852,91.221,232.085,0,187.97,0h-0.219c-20.371,0-39.577,20.174-54.08,56.635c-13.046,32.798-21.391,76.331-22.895,119.548c-0.049,1.425-0.196,2.408-1.718,3.439L91.916,190.32c-6.198,3.877-11.014,12.631-10.963,19.94l0.711,102.436c0.052,7.409,4.761,10.782,9.114,10.782c2.384,0,4.796-0.89,7.167-2.644l42.65-31.522c1.008-0.745,1.971-1.624,2.877-2.602l35.097,83.441c3.629,8.626,8.823,9.913,11.596,9.913c2.771,0,7.959-1.286,11.582-9.896l35.322-83.987c0.884,0.914,1.817,1.74,2.791,2.44l43.083,30.881c2.352,1.688,4.732,2.499,7.076,2.499h0.002c2.334,0,4.507-0.849,6.12-2.473c1.373-1.382,3.002-3.937,2.971-8.369L298.399,208.739z M157.158,97c0-18.196,14.804-33,33-33s33,14.804,33,33s-14.804,33-33,33S157.158,115.196,157.158,97z')
        .attr('height', 20)
        .attr('width', 20)
        .attr('transform', 'scale(.07)')
        .attr('data-cosmodrome', d => d.name)
        .style('fill', d => d.fill || options.defaultFill)
        .style('stroke', '#fff');
 
  markers.exit()
    .transition()
      .attr("height", 0)
      .remove();

  selectAll('.datamaps-marker')
    .append('g')
      .attr('class', 'g-tip')
    .append('circle')
      .attr('cx', 13)
      .attr('cy', -10)
      .attr('r', 10)
      .style('fill', '#6C7B81');

  selectAll('.g-tip')
    .append('text')
      .attr('class', 'tip')
      .attr('x', 13)
      .attr('y', -10)
      .attr('dy', '.35em')
      .style('text-anchor', 'middle')
      .html(d => d.launches);

  function datumHasCoords (datum) {
    return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
  }

}


/**
 * Draw a worldMap in the provided element.
 * @param {DOM} elem - The DOM element in which to draw the worldMap.
 * @param {Object[]} worldMapData - The data to use in the worldMap.
 */
function worldMap ( elem, data, launchingPlaces ) {
  var styles = window.getComputedStyle(elem);
  var paddingH = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  var paddingV = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  var titleHeight = 0;  // This is the height of each tile title. It is hardcoded. // TODO make it dynamic
  var highlightedCountries = {};
  var countriesToHighlight = {};
  let dashboard = this;

  var margin = {top: 10, right: 10, bottom: 10, left: 10},
      width = elem.offsetWidth - margin.left - margin.right - paddingH,
      height = elem.offsetHeight - margin.top - margin.bottom - paddingV - titleHeight;

  var map = new Datamap({
      element: elem,
      width: width,
      height: width / 2.074132492,
      fills: {
        defaultFill: '#E0E6D4' // The keys in this object map to the "fillKey" of [data] or [bubbles]
      },
      done: function (datamap) {
        datamap.svg.selectAll('.datamaps-subunit').on('click', function(geography) {
          let countryName = geography.properties.name;

          if ( countryName === 'United States of America' ) {
            countryName = 'USA';
          }

          dashboard.filters('country', countryName)
            .filterData()
            .updateCharts();
        });
      }
  });

  data.forEach(d => {
    d['Country of Operator/Owner'].split('/').forEach(country => {
      countriesToHighlight[countryCodes[country]] = dashboard.colors.mapHighlight;
      highlightedCountries[countryCodes[country]] = '#E0E6D4';
    })
  });

  launchingPlaces = countLaunchesByLaunchingPlace(data, launchingPlaces);
  cosmodromes.forEach(cosmodrome => {
    launchingPlaces.forEach(place => {
      if ( place.place === cosmodrome.name ) {
        cosmodrome.launches = place.launches;
      }
    });
  });
  
  map.addPlugin('markers', handleMarkers)
  map.markers(cosmodromes, {defaultFill: '#3A5169'});
  map.updateChoropleth(countriesToHighlight);

  map.svg
      .selectAll('.launch-site')
      .on('click', d => {
        dashboard.filters('cosmodrome', d.name)
          .filterData()
          .updateCharts();
      })


  let update = ( data ) => {
    let t = transition().duration(500);
    let selectedCosmodromes = {};
    countriesToHighlight = Object.assign({}, highlightedCountries);
    highlightedCountries = {};
    
    // Color current selected countries into corresponding color
    data.forEach(d => {
      d['Country of Operator/Owner'].split('/').forEach(country => {
        let highlightColor = dashboard.colors.mapHighlight;
        if ( dashboard.dataFilters.country && dashboard.dataFilters.country !== country ) {
          highlightColor = '#FFCD7D';
        }
        countriesToHighlight[countryCodes[country]] = highlightColor;
        highlightedCountries[countryCodes[country]] = '#E0E6D4';
      })
      selectedCosmodromes[d['Launch Site']] = selectedCosmodromes[d['Launch Site']] || 0;
      selectedCosmodromes[d['Launch Site']] += 1;
    });

    launchingPlaces = countLaunchesByLaunchingPlace(data, launchingPlaces);
    cosmodromes.forEach(cosmodrome => {
      launchingPlaces.forEach(place => {
        if ( place.place === cosmodrome.name ) {
          cosmodrome.launches = place.launches;
        }
      });
    });

    selectAll('.launch-site')
      .filter(d => !selectedCosmodromes[d.name])
      .transition(t)
        .style('fill', '#9AA7B5')
        .style('stroke-width', 0);

    selectAll('.launch-site')
      .filter(d => selectedCosmodromes[d.name])
      .transition(t)
        .style('fill', '#3A5169')
        .style('stroke-width', '1px');

    let visibleTips = selectAll('.g-tip')
      .filter(d => !selectedCosmodromes[d.name]);

    let invisibleTips = selectAll('.g-tip')
      .filter(d => selectedCosmodromes[d.name]);

    visibleTips
      .transition(t)
        .style('opacity', 0);

    invisibleTips
      .transition(t)
        .style('opacity', 1);

    selectAll('.g-tip text')
        .text(d => d.launches);

    map.updateChoropleth(countriesToHighlight);

  }

  return {
    update
  };
}

export default worldMap;

// Icon made by http://www.flaticon.com/authors/freepik from www.flaticon.com
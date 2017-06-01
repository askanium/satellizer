/**
 * Extract from the dataset information regarding satellite launches.
 * @param {Object[]} data - The dataset to process.
 */
 const launchesDataProcessor = ( data ) => {
  const sizes = [1, 50, 500, 5000, Infinity];
  const sizeToRadius = {
    1: 3,
    50: 4,
    500: 5,
    5000: 6
  }

  // Contains data related to those satellites that contain an estimated life period.
  let estimatedEndSatellites = [];

  // Extract unique launching places aggregated by their counts from the entire dataset for
  // use in the barchart showing the total number of launches from each launching place.
  var launchingPlaces = {};

  data.forEach(d => {

    launchingPlaces[d['Launch Site']] = launchingPlaces[d['Launch Site']] || {launches: 0, Civil: 0, Commercial: 0, Military: 0, Government: 0};
    launchingPlaces[d['Launch Site']].launches += 1;
    d.Users.split('/').forEach(use => {
      launchingPlaces[d['Launch Site']][use] += 1
    });

    if (d.Mass === null) {
      d.size = sizeToRadius[1];
    } else {
      for (let i = 0; i < sizes.length; i++) {
        if (d.Mass < sizes[i]) {
          d.size = sizeToRadius[sizes[i-1]]
          break;
        }
      }
    }

    d.Date = new Date(d.Date);
    d.normalizedDate = new Date(d.Date.getFullYear(), d.Date.getMonth(), 15);

    if (d.Date && d['Exp.Lifetime(Months)']) {
      let date = new Date(d.Date);
      d.DateEnd = new Date(date.setMonth(date.getMonth() + d['Exp.Lifetime(Months)']));

      // Add a new entry into the estimatedEndSatellites to visualize on the dashboard
      let copy = Object.assign({}, d, {'Date': d.DateEnd, 'estimated': true});
      estimatedEndSatellites.push(copy);
    } else {
      d.DateEnd = null;
    }
  });

  for (let place in launchingPlaces) {
    let dominantUse = '';
    let maxUse = 0;
    for (let use in launchingPlaces[place]) {
      if ( launchingPlaces[place][use] > maxUse && use !== 'launches' ) {
        dominantUse = use;
        maxUse = launchingPlaces[place][use];
      }
    }
    launchingPlaces[place].dominantUse = dominantUse;
  }

  data.sort((a, b) => {
    if ( a.Date.getTime() === b.Date.getTime() ) {
      return (a['Launch Site'] < b['Launch Site'] ? -1 : (a['Launch Site'] > b['Launch Site'] ? 1 : 0));
    } else {
      return a.Date.getTime() - b.Date.getTime();
    }
  });

  // Sort extracted launching places in descending order
  var sortedLaunchingPlaces = [];
  for (let key in launchingPlaces) {
    sortedLaunchingPlaces.push({place: key, launches: launchingPlaces[key].launches, dominantUse: launchingPlaces[key].dominantUse})
  }
  sortedLaunchingPlaces.sort((a, b) => b.launches - a.launches);

  return countLaunchesByLaunchingPlace(data, sortedLaunchingPlaces);
}

const countLaunchesByLaunchingPlace = ( data, launchingPlaces ) => {
  launchingPlaces.forEach(place => {
    place.sharedUses = ['Commercial/Government', 'Government/Civil', 'Military/Civil', 'Military/Commercial', 'Military/Government'];
    place.launches = 0;
    place.Civil = 0;
    place.Commercial = 0;
    place.Military = 0;
    place.Government = 0;
    place["Commercial/Government"] = 0;
    place["Government/Civil"] = 0;
    place["Military/Civil"] = 0;
    place["Military/Commercial"] = 0;
    place["Military/Government"] = 0;
    place.dominantUse = '';
  });
  data.forEach(d => {
    launchingPlaces.forEach(place => {
      if (place.place === d['Launch Site']) {
        place.launches += 1;
        if (d.Users.indexOf('/') > -1) {
          place[d.Users] += 1;
        }
        d.Users.split('/').forEach(use => {
          place[use] += 1
        });
      }
    });
  });

  for (let place in launchingPlaces) {
    let dominantUse = '';
    let maxUse = 0;
    for (let use in launchingPlaces[place]) {
      if ( launchingPlaces[place][use] > maxUse && use !== 'launches' ) {
        dominantUse = use;
        maxUse = launchingPlaces[place][use];
      }
    }
    launchingPlaces[place].dominantUse = dominantUse;
  }
  return launchingPlaces;
}

const prepareLaunchesBarChartData = ( data ) => {
  var chartData = [];

  data.forEach(d => {
    var x0 = 0;
    let launches = [];

    d.sharedUses.forEach(sharedUse => {
      sharedUse.split('/').forEach(use => d[use] -= d[sharedUse]);
    });

    launches.push({place: d.place, use: 'Commercial', launches: d.Commercial, x0: x0, x1: d.Commercial});
    x0 += d.Commercial;
    launches.push({place: d.place, use: 'Government', launches: d.Government, x0: x0, x1: x0 + d.Government});
    x0 += d.Government;
    launches.push({place: d.place, use: 'Military', launches: d.Military, x0: x0, x1: x0 + d.Military});
    x0 += d.Military;
    launches.push({place: d.place, use: 'Civil', launches: d.Civil, x0: x0, x1: x0 + d.Civil});
    x0 += d.Civil;

    d.sharedUses.forEach(sharedUse => {
      launches.push({place: d.place, use: sharedUse, launches: d[sharedUse], x0: x0, x1: x0 + d[sharedUse]});
      x0 += d[sharedUse];
    });
    chartData.push(launches);
  });

  return chartData;
};
export { launchesDataProcessor, countLaunchesByLaunchingPlace, prepareLaunchesBarChartData };

/**
 * Extract from the dataset information regarding satellite launches by country.
 * @param {Object[]} data - The dataset to process.
 */
function countryLaunchesDataProcessor ( allData, selectedData ) {
  let dashboard = this;
  let chartData = [];

  if ( !dashboard.flags.sortedByCountry ) {
    let countriesGroups = generateEmptyCountriesObj(allData);

    selectedData.forEach(d => {
      let countries = d['Country of Operator/Owner'];
      // if ( countries.indexOf('/') === -1 ) {
      //   countriesGroups[countries].total += 1;
      //   countriesGroups[countries][d.Users] += 1;
      // } else {
        countries.split('/').forEach(country => {
          countriesGroups[country].total += 1;
          if ( d.Users.indexOf('/') > -1 ) {
            countriesGroups[country][d.Users] += 1;
          }
          d.Users.split('/').forEach(use => {
            countriesGroups[country][use] += 1;
          })
        });
      // }
    });

    let processedData = Object.keys(countriesGroups).map(country => { 
      var x0 = 0;
      let launches = [];
      const sharedUses = ['Commercial/Government', 'Government/Civil', 'Military/Civil', 'Military/Commercial', 'Military/Government'];

      sharedUses.forEach(sharedUse => {
        sharedUse.split('/').forEach(use => countriesGroups[country][use] -= countriesGroups[country][sharedUse]);
      });

      launches.push({use: 'Commercial', launches: countriesGroups[country].Commercial, x0: x0, x1: countriesGroups[country].Commercial});
      x0 += countriesGroups[country].Commercial;
      launches.push({use: 'Government', launches: countriesGroups[country].Government, x0: x0, x1: x0 + countriesGroups[country].Government});
      x0 += countriesGroups[country].Government;
      launches.push({use: 'Military', launches: countriesGroups[country].Military, x0: x0, x1: x0 + countriesGroups[country].Military});
      x0 += countriesGroups[country].Military;
      launches.push({use: 'Civil', launches: countriesGroups[country].Civil, x0: x0, x1: x0 + countriesGroups[country].Civil});
      x0 += countriesGroups[country].Civil;

      sharedUses.forEach(sharedUse => {
        launches.push({use: sharedUse, launches: countriesGroups[country][sharedUse], x0: x0, x1: x0 + countriesGroups[country][sharedUse]});
        x0 += countriesGroups[country][sharedUse];
      });
      
      return {total: countriesGroups[country].total, launches: launches, country: country};
      // let dominantUse = '';
      // let maxUse = 0;
      // ['Civil', 'Government', 'Military', 'Commercial'].forEach(use => {
      //   if ( countriesGroups[country][use] > maxUse ) {
      //     dominantUse = use;
      //     maxUse = countriesGroups[country][use];
      //   }
      // });
      // return {country: country, own: countriesGroups[country].own, shared: countriesGroups[country].shared, dominantUse: dominantUse}; 
    });
    processedData.sort((a, b) => b.total - a.total);
    dashboard.launchesByCountry = processedData;
    dashboard.flags.sortedByCountry = true;
  }

  return dashboard.launchesByCountry;
}

const generateEmptyCountriesObj = ( allData ) => { 
  let result = {};

  allData.forEach(d => {
    let countries = d['Country of Operator/Owner'];
    if ( countries.indexOf('/') === -1 ) {
      result[countries] = result[countries] || {
        total: 0, 
        Civil: 0, 
        Commercial: 0, 
        Military: 0, 
        Government: 0, 
        "Commercial/Government": 0,
        "Government/Civil": 0,
        "Military/Civil": 0,
        "Military/Commercial": 0,
        "Military/Government": 0
      };   
    } else {
      countries.split('/').forEach(country => {
        result[country] = result[country] || {
          total: 0, 
          Civil: 0, 
          Commercial: 0, 
          Military: 0, 
          Government: 0, 
          "Commercial/Government": 0,
          "Government/Civil": 0,
          "Military/Civil": 0,
          "Military/Commercial": 0,
          "Military/Government": 0
        };
      });
    }
  });

  return result;
}

export default countryLaunchesDataProcessor;

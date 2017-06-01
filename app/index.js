import { json } from 'd3';
import Dashboard from './dashboard';


window.onload = function () {
  var rootDom = document.getElementById('dashboard');
  window.dashboard = new Dashboard(rootDom);

  json('data/satellites.json', function (error, data) {
    if (error) throw error;

    window.dashboard.data(data).draw();
  })
};

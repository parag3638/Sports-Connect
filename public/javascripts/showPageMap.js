mapboxgl.accessToken = 'pk.eyJ1IjoiYW5tb2xiaGFyZHdhajE3IiwiYSI6ImNrbHBoN2tiaDEycjkyb2w2ZW5qM3hzemQifQ.dARqyRLRi7EsrlF4430ooA';
var map = new mapboxgl.Map({
container: 'map', // container ID
style: 'mapbox://styles/mapbox/light-v10', // style URL
center: campground.geometry.coordinates, // starting position [lng, lat]
zoom: 9 // starting zoom
});

new mapboxgl.Marker()
.setLngLat(campground.geometry.coordinates)
.setPopup(
  new mapboxgl.Popup({offset: 24})
  .setHTML(
    `<h4>${campground.title}</h4><p>${campground.location}</p>`
  )
)
.addTo(map)

map.addControl(new mapboxgl.NavigationControl());
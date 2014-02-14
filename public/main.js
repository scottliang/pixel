var socket = io.connect();

var map;
var MY_MAPTYPE_ID = 'custom_style';
var cambridge = new google.maps.LatLng(42.3758, -71.1139);
var marker = null;

var me = null;
var users = {}; //redundant

var cellArray = [];

var colors = ["#F2385A", "gray", "#36B1BF"]
var infoWindow = new google.maps.InfoWindow();



function User (_id) {
  this.userServerId = _id; //user id assigned by server
  this.userDbId = null; //assigned by DB
  this.username = null;
  this.position = null;
  this.votes = [];
}

socket.on('welcome', function (_data) {
  console.log('welcome');
  console.log(_data);
  me = new User(_data.id);
  users[_data.id] = me; //redundant
})



var watchOptions = {frequency: 3000};

function getLocation()
{
  if (navigator.geolocation)
  {
    navigator.geolocation.getCurrentPosition(initialize, watchError, watchOptions); //*
  }
}
function watchError(error) {
  console.log('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
}



function initialize(_position) {

  var myLat = _position.coords.latitude;
  var myLng = _position.coords.longitude;
  var myLatLng = new google.maps.LatLng(myLat, myLng);

  var mapOptions = {
    zoom: 17,
    minZoom: 16,
    center: myLatLng,
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP, MY_MAPTYPE_ID]
    },
    mapTypeId: MY_MAPTYPE_ID,

    panControl: false,
    zoomControl: true,
    zoomControlOptions: {
        style: google.maps.ZoomControlStyle.SMALL,
        position: google.maps.ControlPosition.LEFT_CENTER
    },
    mapTypeControl: false,
    scaleControl: false,
    streetViewControl: false,
    overviewMapControl: false
  };

  var featureOpts = [ //STYLEDMAPTYPE
    {
      stylers: [
        { hue: "#FF0000" },
        { saturation: -100 }, //-100 to 100
        { lightness: 20 },
        { visibility: 'simplified' },
        { gamma: 0.5 },
        { weight: 0.5 }
      ]
    },
    {
      elementType: 'labels',
      stylers: [
        { visibility: 'on' },
        { lightness: 50 }
      ]
    },
    {
      featureType: 'water',
      stylers: [
        { color: '#FAFAFA' }
      ]
    }
  ];

  var styledMapOptions = {
    name: 'Red-ify'
  };

  map = new google.maps.Map(document.getElementById('map-canvas'),
      mapOptions);

  var customMapType = new google.maps.StyledMapType(featureOpts, styledMapOptions); //STYLEDMAPTYPE
  map.mapTypes.set(MY_MAPTYPE_ID, customMapType);


  marker = new google.maps.Marker({
    position: myLatLng,
    map: map,
    title: "Drag to move",
    draggable: true,
    icon: 'http://google.com/mapfiles/ms/micons/man.png',
    animation: google.maps.Animation.BOUNCE //also DROP
  });


  var centerMeButton = null;
  google.maps.event.addListener(map, 'center_changed', function() {
    if(!centerMeButton) {
      console.log('You moved away from the center');

      centerMeButton = document.getElementById('centerMeButton');
      $(centerMeButton).fadeIn('slow');
      $(centerMeButton).click(function() {
        map.panTo(myLatLng);
        // marker.setPosition(myLatLng);
        $(centerMeButton).fadeOut('fast');
        centerMeButton = null;
      })
    }
    // clearVotes();
    // showVotesInBounds();
  });


  google.maps.event.addListener(map, 'zoom_changed', function() {
    clearVotes();
    showVotesInBounds();
  })

  drawCells();
  scaleCells();

  showLoginPopup();
  vote();
}



function showLoginPopup() {
  loginBackdrop = document.getElementById('loginBackdrop');
  $(loginBackdrop).delay(1000).fadeIn(1000);

  loginPopup = document.getElementById('loginPopup');
  $(loginPopup).delay(2000).fadeIn(3000).draggable();

  $(loginBackdrop).click(function() {
    $(loginPopup).animate('bounce');
  })
}

function createProfile() {
  me.username = document.getElementById("username").value;  //Need to first be verified by db
  myPassword = document.getElementById("password").value;

  socket.emit( 'createProfile', {'id': me.userServerId, 'username': me.username, 'password': myPassword });

  socket.on( 'profileError', function (_data) {
    alert(_data.error);
  })

  socket.on('profileAccepted', function (_data) {
    console.log("your database id is: ");
    console.log(_data[0]._id);
    me.userDbId = _data[0]._id;

    $('#loginBackdrop').fadeOut('slow');
    $('#loginTable').hide();
    $('#loginPopup').fadeOut('fast');

    $('#like').animate({ top: '0%' }, 500, 'easeInOutBack');
    $('#dislike').animate({ top: '0%' }, 500, 'easeInOutBack');

    drawCircles();

    clearVotes();
    showVotesInBounds();
  })

}

function login() {
  me.username = document.getElementById("username").value;
  myPassword = document.getElementById("password").value;

  socket.emit('loggedIn', { 'id': me.userServerId, 'username': me.username, 'password': myPassword });

  socket.on('loginError', function (_data) {
    alert(_data.error);
  })

  socket.on('loginAccepted', function (_data) {
    console.log("your database id is: ");
    console.log(_data._id);
    me.userDbId = _data._id;

    $('#loginBackdrop').fadeOut('slow');
    $('#loginTable').hide();
    $('#loginPopup').fadeOut('fast');

    $('#like').animate({ top: '0%' }, 400, 'easeInOutBack');
    $('#dislike').animate({ top: '0%' }, 400, 'easeInOutBack');

    drawCircles();

    clearVotes();
    showVotesInBounds();
  })
}

function drawCircles() {
  $('#circle1').delay(1000).show('scale', { duration: 200, easing: 'easeInOutBack' }, function() {
    $('#circle2').show('scale', { duration: 200, easing: 'easeInOutBack' }, function() {
      $('#circle3').show('scale', { duration: 200, easing: 'easeInOutBack' });
    });
  });


  $('#circle3').click(function() {
    $('#circle3').animate({
      width: '-=10px',
      height: '-=10px',
      left: '+=5px', //Scales from the center
      top: '+=5px'
      }, 10)
    .animate({
      width: '+=10px',
      height: '+=10px',
      left: '-=5px',
      top: '-=5px'
    }, 500, 'easeOutElastic');

    colorizeCellsRandomly();
  })

  $('#circle2').click(function() {
    $('#circle2').animate({
      width: '-=10px',
      height: '-=10px',
      left: '+=5px', //Scales from the center
      top: '+=5px'
      }, 10)
    .animate({
      width: '+=10px',
      height: '+=10px',
      left: '-=5px',
      top: '-=5px'
    }, 500, 'easeOutElastic');

    
  })

  $('#circle1').click(function() {
    $('#circle1').animate({
      width: '-=10px',
      height: '-=10px',
      left: '+=5px', //Scales from the center
      top: '+=5px'
      }, 10)
    .animate({
      width: '+=10px',
      height: '+=10px',
      left: '-=5px',
      top: '-=5px'
    }, 500, 'easeOutElastic');

    colorizeCellsToDefault();
  })
}

function vote (_position) { //SANDBOX, copy paste below when ready
  var waiting = false;

  $('#like').click(function() {
    if (waiting) return;  //End if waiting is true
    waiting = true;

    $('#like').animate({
      width: '-=50px',
      height: '-=10px',
      left: '+=25px', //Scales from the center
      top: '+=5px'
      }, 10)
    .animate({
      width: '+=50px',
      height: '+=10px',
      left: '-=25px',
      top: '-=5px'
    }, 500, 'easeOutElastic');

    $('#likeEffect').show().hide('scale', { duration: 400 });
    
    markerPosition = marker.getPosition();
    me.position = [markerPosition.nb, markerPosition.ob]; //just changed from ob and pb
    me.votes.push({ userServerId: me.userServerId, userDbId: me.userDbId, username: me.username, 
      position: me.position, value: 1, time: null, voteDbId: null, tag: null }); //time is assigned by server
    users[me.userServerId] = me; //redundant

    socket.emit('voted', { 'userServerId': me.userServerId, 'userDbId': me.userDbId, 'username': me.username, 
      'position': me.position, 'value': 1 });
  })

  $('#dislike').click(function() {
    if (waiting) return;
    waiting = true;

    $('#dislike').animate({
      width: '-=50px',
      height: '-=10px',
      left: '+=25px',
      top: '+=5px'
      }, 10)
    .animate({
      width: '+=50px',
      height: '+=10px',
      left: '-=25px',
      top: '-=5px'
    }, 500, 'easeOutElastic');

    $('#dislikeEffect').show().hide('scale', { duration: 400 });

    markerPosition = marker.getPosition();
    me.position = [markerPosition.nb, markerPosition.ob];
    me.votes.push({ userServerId: me.userServerId, userDbId: me.userDbId, username: me.username, 
      position: me.position, value: 0, time: null, voteDbId: null, tag: null });
    users[me.userServerId] = me;

    socket.emit('voted', { 'userServerId': me.userServerId, 'userDbId': me.userDbId, 'username': me.username, 
      'position': me.position, 'value': 0 });
  })

  socket.on('voteSaved', function (_data) { //completing with data from server
    console.log("the db has saved the following time and id: ");
    console.log(_data.time);
    console.log(_data.voteDbId);
    console.log(_data);

    me.votes[me.votes.length-1].time = _data.time;
    me.votes[me.votes.length-1].voteDbId = _data.voteDbId;
    
    tagPrompt();
    waiting = false;

    clearVotes();
    showVotesInBounds();
  })
}



function tagPrompt() {
  var tagDiv = document.getElementById('tagDiv');
  $(tagDiv).delay(100).fadeIn('slow');

  $('#tagDiv').keypress(function(e){
    if ( e.which == 13 ) return false;
    // //or...
    // if ( e.which == 13 ) e.preventDefault();
  });

}

function submitTag() {
  me.votes[me.votes.length-1].tag = document.getElementById('tag').value;
  users[me.userServerId] = me; //redundant

  $('#tagDiv').fadeOut(500);
  $('#tag').val('');

  socket.emit('tagged', {'voteDbId': me.votes[me.votes.length-1].voteDbId, 'tag': me.votes[me.votes.length-1].tag });
}

socket.on('tagSaved', function (_data) {
  console.log(_data);

  clearVotes();
    showVotesInBounds();
})

function dismissTagPrompt() {
  $('#tagDiv').delay(100).fadeOut(500);
  $('#tag').val(''); //implement 'waiting'
}



//.............................tests
socket.on('test', function (_data) {
  console.log("test: " + _data);
})

socket.on('test2', function (_data) {
  console.log("the server has sent you: " + _data.test2object1);
  console.log("the server has sent you: " + _data.test2object2);
})

socket.on('dbData', function (_data) {
  console.log("the database has sent you: " + _data);
  console.log(_data);
})

socket.emit("data", {a:0.5}, function(_da) {
  console.log(_da);
}); //* shortened syntax




function drawCells() {
  var NW = new google.maps.LatLng(42.3838, -71.1288);  //Cambridge, MA coordinates; starting point of grid
  var width = 100; //* number of cells
  var height = 100;

  //computeOffset(from: LatLng, distance: number, heading: degree clockwise from true north, radius?: number)
  var NS = google.maps.geometry.spherical.computeOffset(NW, 20, 90);
  var SS = google.maps.geometry.spherical.computeOffset(NW, 20, 180);

  for (var i = 0; i < height; i++) {
    NE = google.maps.geometry.spherical.computeOffset(NS, i * 20, 180);  //Column
    SW = google.maps.geometry.spherical.computeOffset(SS, i * 20, 180);

    var nw = google.maps.geometry.spherical.computeOffset(NE, 20, 270);
    var se = google.maps.geometry.spherical.computeOffset(SW, 20, 90);

    for (var j = 0; j < width; j++) {
      var cell = new google.maps.Rectangle();
      var cellOptions = {
        strokeColor: "#FFFFFF",
        strokeOpacity: 0.2,
        strokeWeight: 1,
        fillOpacity: .4,
        map: map,
        bounds: new google.maps.LatLngBounds(SW, NE)
      };

      cell.setOptions( cellOptions );

      bindInfoPopup( cell, cellArray.length );

      highlightCell( cell, [NE, SW], [nw, se] );

      cellArray.push(cell);


      var NE = google.maps.geometry.spherical.computeOffset(NE, 20, 90); //Row
      var SW = google.maps.geometry.spherical.computeOffset(SW, 20, 90);

      var nw = google.maps.geometry.spherical.computeOffset(NE, 20, 270);
      var se = google.maps.geometry.spherical.computeOffset(SW, 20, 90);
    }
  }

  for (var k = 0; k < (height * width); k++) {
    cellArray[k].votes = [];  //*

    cellArray[k].likes = 0;
    cellArray[k].dislikes = 0;
    cellArray[k].likability = null;
  }
}

function bindInfoPopup(cell, num) {
  //addListener(instance: Object, eventName: string, handler: Function)
  var likabilityTd = document.getElementById('infoLikability');
  var likesTd = document.getElementById('infoLikes');
  var dislikesTd = document.getElementById('infoDislikes');
  var tagTd = document.getElementById('infoTags');
  var cellNumberTd = document.getElementById('infoCellNumber');

  var popupTag = '';

  google.maps.event.addListener(cell, 'click', function(event) {

    console.log("clicked");

    for ( var i = 1; i <= cellArray[num].votes.length; i++ ) {
      if ( cellArray[num].votes[cellArray[num].votes.length-i].tag ) {
        popupTag = cellArray[num].votes[cellArray[num].votes.length-i].tag;
        break;
      }
    }

    if ( !isNaN( cellArray[num].likes / (cellArray[num].likes + cellArray[num].dislikes) ) ) {
      cellArray[num].likability = cellArray[num].likes / (cellArray[num].likes +
        cellArray[num].dislikes) * 100;
    }
    else {
      cellArray[num].likability = 0;
    }

    likabilityTd.innerHTML = cellArray[num].likability + "%";
    likesTd.innerHTML = cellArray[num].likes;
    dislikesTd.innerHTML = cellArray[num].dislikes;
    tagTd.innerHTML = popupTag;
    cellNumberTd.innerHTML = num;

    $('#infoBackdrop').fadeIn('slow');
    $('#infoPrePopup').show('scale', { duration: 300, easing: 'easeInOutBack' }, function() {
      $('#infoPopup').fadeIn('fast', function() {
        $('#infoPrePopup').fadeOut('slow');
      });
    });

    $('#infoBackdrop').click(function() {
      $('#infoBackdrop').fadeOut('fast');
      $('#infoPopup').fadeOut('fast');
    })

  });

}



var voteArray = []; //these two should match
var voteMarkers = [];

var votes;
var likeMarker = 'images/smile3.png';
var dislikeMarker = 'images/frown3.png';

var mapBounds;

function showVotesInBounds() {
  mapBounds = map.getBounds();
  dbBounds = [ [mapBounds.ta.d, mapBounds.ga.b], [mapBounds.ta.b, mapBounds.ga.d] ]; //db bounds are b-l to u-r!
  
  socket.emit( 'getVotesInBounds', {'dbBounds': dbBounds} );
}

socket.on('votesInBoundsFound', function (_data) {
  for (var i = 0; i < _data.length; i++) {
    if (_data[i].value == 1) {
      votes = new google.maps.Marker({
        id: _data[i].voteDbId, //confusing
        icon: likeMarker,
        position: new google.maps.LatLng(_data[i].position[0], _data[i].position[1]),
        map: map,
        title: _data[i]._id, //
        // animation: google.maps.Animation.DROP,
        visible: false
      });
    }
    else {
      votes = new google.maps.Marker({
        id: _data[i].voteDbId,
        icon: dislikeMarker,
        position: new google.maps.LatLng(_data[i].position[0], _data[i].position[1]),
        map: map,
        title: _data[i]._id,
        // animation: google.maps.Animation.DROP,
        visible: false
      });
    }

    voteArray.push(_data[i]);
    voteMarkers.push(votes);
  }
  
  console.log('votesInBoundsFound: ');
  console.log(_data);

  activateCells();
})


function activateCells() {
  var cellBounds;
  var voteRefresh = [];
  var likeRefresh = 0;
  var dislikeRefresh = 0;

  for (var i = 0; i < cellArray.length; i++) {
    cellBounds = cellArray[i].getBounds();

    for (var j = 0; j < voteArray.length; j++) {

      if (cellBounds.contains(voteMarkers[j].position)) {

        voteRefresh.push(voteArray[j]);

        if (voteArray[j].value == 1) {
          ++likeRefresh;
        } else if (voteArray[j].value == 0) {
          ++dislikeRefresh;
        }

      }
    }

    cellArray[i].votes = voteRefresh; //clumsy
    voteRefresh = [];

    cellArray[i].likes = likeRefresh;
    likeRefresh = 0;
    cellArray[i].dislikes = dislikeRefresh;
    dislikeRefresh = 0;
  }

  colorizeCells ();
}

function colorizeCells () { //combine with above when ready
  var likesPercent;

  var averageVotes;
  var totalVotes = voteArray.length;
  var cellsWithVotes = 0;

  var totalVotesInCell;
  var totalVotesArray = []; //to find max and min

  var mostVotes;
  var leastVotes;

  
  var newFillColor;
  var newStrokeColor;

  for ( var i = 0; i < cellArray.length; i++ ) {

    if ( cellArray[i].likes > 0 || cellArray[i].dislikes > 0 ) {
      likesPercent = (cellArray[i].likes / ( cellArray[i].likes + cellArray[i].dislikes )) * 100;

      totalVotesInCell = cellArray[i].votes.length;

      if ( likesPercent >= 0 && likesPercent <= 10 ) {
        newFillColor = '#F2385A';
        newStrokeColor = '#F2385A';
      }
      else if ( likesPercent >= 11 && likesPercent <= 20 ) {
        newFillColor = '#EF657E';
        newStrokeColor = '#F2385A';
      }
      else if ( likesPercent >= 21 && likesPercent <= 30 ) {
        newFillColor = '#EC889A';
        newStrokeColor = '#EF657E';
      }
      else if ( likesPercent >= 31 && likesPercent <= 40 ) {
        newFillColor = '#EAABB7';
        newStrokeColor = '#EC889A';
      }
      else if ( likesPercent >= 41 && likesPercent <= 47 ) {
        newFillColor = '#E8CED3';
        newStrokeColor = '#EAABB7';
      }
      else if ( likesPercent >= 48 && likesPercent <= 53 ) { //mid
        newFillColor = '#E6E6E6';
        newStrokeColor = '#F2F2F2';
      }
      else if ( likesPercent >= 54 && likesPercent <= 60 ) {
        newFillColor = '#B9D8DC';
        newStrokeColor = '#94CDD4';
      }
      else if ( likesPercent >= 61 && likesPercent <= 70 ) {
        newFillColor = '#94CDD4';
        newStrokeColor = '#72C3CC';
      }
      else if ( likesPercent >= 71 && likesPercent <= 80 ) {
        newFillColor = '#72C3CC';
        newStrokeColor = '#4FB9C5';
      }
      else if ( likesPercent >= 81 && likesPercent <= 90 ) {
        newFillColor = '#4FB9C5';
        newStrokeColor = '#36B1BF';
      }
      else if ( likesPercent >= 91 && likesPercent <= 100 ) {
        newFillColor = '#36B1BF';
        newStrokeColor = '#36B1BF';
      }

      ++ cellsWithVotes;

      totalVotesArray.push( totalVotesInCell );

      cellArray[i].setOptions({ fillColor: newFillColor, strokeColor: newStrokeColor });
    }
  }

  averageVotes = totalVotes / cellsWithVotes;

  mostVotes = Math.max.apply(Math, totalVotesArray);
  leastVotes = Math.min.apply(Math, totalVotesArray);


  popularizeCells(averageVotes, mostVotes, leastVotes); //*

  cellsWithVotes = 0;
  totalVotesArray = [];
}

function popularizeCells(averageVotes, mostVotes, leastVotes) {
  var cellPopularity;
  var newOpacity;
  var newStrokeWeight;

  for ( var i = 0; i < cellArray.length; i++ ) {

    if ( cellArray[i].likes > 0 || cellArray[i].dislikes > 0 ) {
      cellPopularity = cellArray[i].votes.length;

      if (cellPopularity == averageVotes) {
        newOpacity = .5;
        newStrokeWeight = 3;
      }
      else if (cellPopularity < averageVotes) {
        newOpacity = ( (50 - 20) / (averageVotes - leastVotes) * (cellPopularity - leastVotes) + 20 ) / 100;
        newStrokeWeight = ( (3 - 2) / (averageVotes - leastVotes) * (cellPopularity - leastVotes) + 2 );
      }
      else if (cellPopularity > averageVotes) {
        newOpacity = ( (80 - 50) / (mostVotes - averageVotes) * (cellPopularity - averageVotes) + 50 ) / 100;
        newStrokeWeight = ( ( 4 - 3 ) / (averageVotes - leastVotes) * (cellPopularity - leastVotes) + 3 );
      }

      cellArray[i].setOptions({ fillOpacity: newOpacity, strokeWeight: newStrokeWeight, strokeOpacity: .9,
        strokePosition: google.maps.StrokePosition.INSIDE});//, zIndex: 1002 });

    }
  }

}

function colorizeCellsRandomly () {
  for ( var i = 0; i < cellArray.length; i++ ) {
    if ( cellArray[i].likes == 0 && cellArray[i].dislikes == 0 ) {
      cellArray[i].setOptions({
        fillColor: colors[ Math.floor( Math.random() * colors.length ) ],
        fillOpacity: Math.random()/2,
      });
    }
  }
}

function colorizeCellsToDefault () {
  for ( var i = 0; i < cellArray.length; i++ ) {
    if ( cellArray[i].likes == 0 && cellArray[i].dislikes == 0 ) {
      cellArray[i].setOptions({
        fillColor: '#000000',
        fillOpacity: 0.4,
      });
    }
  }
}

function highlightCell(cell, coord1, coord2) {
  var plineOne = null;
  var plineTwo = null;

  google.maps.event.addListener(cell, 'mouseover', function(event) {
    plineOne = new google.maps.Polyline({
      path: coord1,
      geodesic: true,
      strokeColor: '#FFFFFF',
      strokeOpacity: 1.0,
      strokeWeight: 2,
      zIndex: 1001
    });
    plineOne.setMap(map);

    plineTwo = new google.maps.Polyline({
      path: coord2,
      geodesic: true,
      strokeColor: '#FFFFFF',
      strokeOpacity: 1.0,
      strokeWeight: 2,
      zIndex: 1001
    });
    plineTwo.setMap(map);
  });

  google.maps.event.addListener(cell, 'mouseout', function(event) {
    plineOne.setMap(null);
    plineTwo.setMap(null);
  });
}

function scaleCells () {
  google.maps.event.addListener(map, 'zoom_changed', function() {
    console.log(map.getZoom());

    // if ( map.getZoom() == 19 ) {

    //   if (cellArray[0].visible == true) {
    //     for ( var i = 0; i < cellArray.length; i++ ) {
    //       cellArray[i].setVisible(false); //use setMap
    //     }
    //   }

    // }

    // if ( map.getZoom() == 18 ) {

    //   if (cellArray[0].visible == false) {
    //     for ( var i = 0; i < cellArray.length; i++ ) {
    //       cellArray[i].setVisible(true);
    //     }
    //   }
      
    // }

  })
}



function clearVotes() {
  for (var i = 0; i < voteMarkers.length; i++ ) {
    voteMarkers[i].setMap(null);
  }

  voteArray = [];
  voteMarkers = [];
}







// function showAllVotes() {
//   socket.emit('getVotes');
//   socket.on('votesFound', function(_data) {

//     console.log(_data);

//     for (var i = 0; i < _data.length; i++) {

//       if (_data[i].value == 1) {
//         votes = new google.maps.Marker({
//           id: _data[i].voteDbId,
//           position: new google.maps.LatLng(_data[i].position.ob, _data[i].position.pb),
//           map: map,
//           title: _data[i]._id,
//           animation: google.maps.Animation.DROP
//         });
//       }
//       else {
//         votes = new google.maps.Marker({
//           id: _data[i].voteDbId,
//           position: new google.maps.LatLng(_data[i].position.ob, _data[i].position.pb),
//           map: map,
//           title: _data[i]._id,
//           animation: google.maps.Animation.DROP
//         });
//       }

//       voteMarkers.push(votes);
//     }

//   })
// }

function adminClearVoteCollection() {
  socket.emit('clearVoteCollection');
}
function adminClearUserCollection() {
  socket.emit('clearUserCollection');
}


google.maps.event.addDomListener(window, 'load', getLocation);

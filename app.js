var express=require('express');
var app=express();
var http=require('http');
var server=http.createServer(app);

app.get("/", function(req, res) {
  res.redirect("/index.html");
});

app.use(express.methodOverride());

app.use(express.bodyParser());

app.use(app.router);

app.use(express.static(process.cwd()+'/public'));

app.use(express.errorHandler({
  dumpExceptions: true, 
  showStack: true
}));

server.listen(process.env.PORT || 6789);


//MongoDB
var mongo = require('mongodb'),
	  MongoServer = mongo.Server,
	  Db = mongo.Db,
	  ObjectID = mongo.ObjectID;

var mdbserver = new MongoServer('localhost', 27017, {auto_reconnect: true});
var db = new Db('DBASE', mdbserver,{safe: true});


var voteCollection = null;						//*
var userCollection = null;

db.open(function(err, db) {
  if(!err) {
    console.log("We are connected to mongoDB");

    db.createCollection(
    	'voteCollection',						//*
    	{safe:false},
    	function(err, collection) {
    		voteCollection = collection;		//*
    		// mongoDBTest();					
    	}
    );

    db.createCollection(
    	'userCollection',						//**
    	{safe:false},
    	function(err, collection) {
    		userCollection = collection;		//**			
    	}
    );
  }
});

//.......................................Node
var io = require('socket.io').listen(server);
io.set('log level', 1);

var userArray = { //redundant
	id: null,
	username: "_",
	password: "_",
	position: null,
	votes: []
};
var voteArray = [];

var next_user_id = 1;

io.sockets.on('connection', function (socket) {
	socket.user = {};							//is this good for keeping a running tally?
	socket.user.id = next_user_id;
	++next_user_id;								//io longer necessary, but keep for now

	socket.user.socket = socket;				//assign the socket to the user so that each user knows her connection conduit
	userArray[socket.user.id] = socket.user;	//stuff all the user data into the userArray, redundant

	socket.broadcast.emit('userentered', {'id': socket.user.id});
	socket.emit('welcome', {'id': socket.user.id});


	socket.on('createProfile', function(_data) {
		userArray[_data.id].username = _data.username; //redundant
		userArray[_data.id].password = _data.password;

		if(userCollection) {
			var addUser = { username: _data.username, password: _data.password };

			userCollection.findOne( {username: _data.username}, function(_err, _doc) {
				if (_err || !_doc) {
					userCollection.insert( addUser , {safe: true}, function(_err, _doc2) {
						delete _doc2.password;
						socket.emit('profileAccepted', _doc2);
					});	//*
				}
				else {
					socket.emit('profileError', { error: "username already registered" });
				}
			})
		}

		socket.emit('test2', { 'test2object1': userArray[_data.id].username, 'test2object2': userArray[_data.id].password })
	})

	socket.on('loggedIn', function(_data) {
		userArray[_data.id].username = _data.username;
		userArray[_data.id].password = _data.password;

		if(userCollection) {

			userCollection.findOne( {username: _data.username}, function(_err, _doc) {
				if (_err || !_doc) {
					socket.emit("loginError", { error: "user not found" });
				}
				else if (_doc.password != _data.password){	//No need to find, bc it returns the whole object
					socket.emit("loginError", { error: "invalid password" });
				}
				else {
					delete _doc.password;
					socket.emit('loginAccepted', _doc);
				}
			});
		}

		socket.emit('test2', { 'test2object1': userArray[_data.id].username, 'test2object2': userArray[_data.id].password })
	})




	var addVote;

	socket.on('voted', function (_data) {

		addVote = { userServerId: _data.userServerId, userDbId: _data.userDbId, username: _data.username,
			position: _data.position, value: _data.value, time: new Date(), tag: null };
		if(voteCollection) {
			voteCollection.insert(addVote, function(_err, _docs) {
				socket.emit('voteSaved', { 'time': _docs[0].time, 'voteDbId': _docs[0]._id, 'everything': _docs[0] });
			});
		}
	})

	socket.on('tagged', function (_data) {

		socket.emit('test', _data.voteDbId );
		voteCollection.update( { _id: ObjectID(_data.voteDbId) }, { $set: { tag: _data.tag } }, { safe: true }, function(_err, _docs) {	//'if you use a callback, set safe to true - this way the callback is executed after the record is saved to the database, if safe is false (default) callback is fired immediately and thus doesn’t make much sense'
			//it IS saving the tag if you use ObjectID
			//It's working w/ safe:true, but it gives me '1' or '0' (not value of vote), so I have to do:
			voteCollection.findOne( { _id: ObjectID(_data.voteDbId) }, function(_err, _docs) {
			socket.emit('tagSaved', _docs);	
			})

			console.log(_err);	//gives null if ok, I think
		});
	})


	socket.on("data", function(_data, _f) {
		_f(_data);
	})	//* shortened syntax


	socket.on('getVotes', function() {
		voteCollection.find( {} ).toArray(function(_err, _docs) {
			socket.emit('votesFound', _docs);
		});
	})


	socket.on('getVotesInBounds', function (_data) {
		dbBounds = _data.dbBounds;

		voteCollection.ensureIndex({position: "2d"}, function(err, docs) {	//just do when create collection
			voteCollection.find({position: {$geoWithin: {$box: dbBounds} } }).toArray(function(_err, _docs) {
				socket.emit('votesInBoundsFound', _docs);
			})
		})
	})	//I need to somehow sort the objects that you pull back



	socket.on('clearVoteCollection', function() {
		voteCollection.drop();
	})
	socket.on('clearUserCollection', function() {
		userCollection.drop();
	})
});



	// var findUser = { username: _data.username, password: _data.password };
	// userCollection.find( findUser ).toArray(function(_err, _docs) {
	// 	socket.emit('data', _docs);	//*How do I verify?
	// })

	//voteCollection.find( addVote ).toArray(function(_err, _docs) {
	//	socket.emit('voteSaved', { 'time': _docs[0].time, 'voteDbId': _docs[0]._id });
	//})

var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var url = require("url");

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

var arduino = new SerialPort("/dev/ttyACM0", {
    baudrate: 19200,
    dataBits: 8, 
    parity: 'none', 
    stopBits: 1, 
    flowControl: false,
    parser: serialport.parsers.readline("\n")
});

var arduinoReady = false;

arduino.on("open", function(){
    console.log('arduino connected');
    setTimeout(arduinoInit , 2000);
});

function arduinoInit() {
	arduinoReady = true;
	arduino.on('data', function getData(data) { 
		receivedData = data.toString().split(' ');

        var nunchuk = {
            'analogX': parseInt(receivedData[0]),
            'analogY': parseInt(receivedData[1]),
            'accelX': parseInt(receivedData[2]),
            'accelY': parseInt(receivedData[3]),
            'accelZ': parseInt(receivedData[4]),
            'zButton': parseInt(receivedData[5]) == 1,
            'cButton': parseInt(receivedData[6]) == 1
        };

        //console.log(nunchuk);

        io.emit('nunchuk', nunchuk);

		});

}

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.use('/static', express.static(__dirname + '/static'));

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(8000, function(){
  console.log('listening on 8000');
});

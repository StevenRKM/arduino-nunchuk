var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var exec = require('child_process').exec;

var url = require("url");

var serialport = require("serialport");
var SerialPort = serialport.SerialPort;

serialport.list(function (err, ports) {
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
});

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
        
        doNunchuk(nunchuk);

        //console.log(nunchuk);

		});

}

// 0 - webpage joystick
// 1 - webpage accelerometer
// 2 - mouse joystick
// 4 - mouse accelerometer
var mode = 0;

var zButton = false;
var cButton = false;
var analogX = 0;
var analogY = 0;
var accelX = 0;
var accelY = 0;
var accelZ = 0;

function doNunchuk(nunchuk) {
	io.emit('nunchuk', nunchuk);
	
	// check buttons
    if(nunchuk.cButton != cButton) {
        cButton = nunchuk.cButton;
        if(cButton) mode = (mode+1) % 4;
        console.log("node changed to "+mode);
    }
    
    if(nunchuk.zButton != zButton) {
        zButton = nunchuk.zButton;
        
        if(mode == 0 || mode == 1) io.emit('colors');
        if(mode == 2 || mode == 3) exec("xdotool click 1");
    }
    
    // movement
    analogX = nunchuk.analogX - 122;
    analogY = nunchuk.analogY - 137;
    accelX = nunchuk.accelX - 500;
    accelY = nunchuk.accelY - 380;
    accelZ = nunchuk.accelZ - 380;
    
    if(mode == 0) {
		io.emit('movement', {
			'x': analogY*-0.0001,
			'y': analogX*0.0001,
			'z': 0
		});
	} else if(mode == 1){
		io.emit('movement', {
			'x': accelY*-0.0001,
			'y': 0,
			'z': accelX*-0.0001
		});
    } else if(mode == 2){
		var x = Math.floor(analogX/5);
		var y = - Math.floor(analogY/5);
		//console.log(x + " " + y);
		exec("xdotool mousemove_relative -- " + x + " " + y);
    
    } else if(mode == 3){
		var x = Math.floor(accelX/10);
		var y = Math.floor(accelY/10);
		//console.log(x + " " + y);
		exec("xdotool mousemove_relative -- " + x + " " + y);
    }
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

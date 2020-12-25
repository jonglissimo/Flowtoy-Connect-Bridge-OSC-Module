var parameterPath = local.parameters;
var valuesPath = local.values;
var lightsContainer;
var wakeUpTrigger = parameterPath.power.wakeUp;
var powerOffTrigger = parameterPath.power.powerOff;
var startSyncTrigger = parameterPath.sync.start;
var stopSyncTrigger = parameterPath.sync.stop;
var resetSyncTrigger = parameterPath.sync.reset;
var numberOfGroupsParameter = parameterPath.sync.numberOfGroups;

var globalGroupName = "Global group";
var groupPrefix = "Group ";
var dirtyGroups = [];


function init() {
	script.setUpdateRate(50);
	createGroups();
}

function update() {
	for(var i=0; i<dirtyGroups.length; i++) {
		var groupName = dirtyGroups[i];
		var groupC = local.getChild("values").getChild(groupName);
		updatePatternForGroupContainer(groupC);
	}

	dirtyGroups = [];
}

function moduleParameterChanged(param) {
	if (param.is(local.outActivity)) return;
	
	if (param.is(wakeUpTrigger)) {
		wakeUp(0,0);
	} else if (param.is(powerOffTrigger)) {
		powerOff(0,0);
	} else if (param.is(startSyncTrigger)) {
		startSync();
	} else if (param.is(stopSyncTrigger)) {
		stopSync();
	} else if (param.is(resetSyncTrigger)) {
		resetSync();
	} else if (param.is(numberOfGroupsParameter)) {
		createGroups();
	}
}

function moduleValueChanged (param) { 
	if (param.is(local.outActivity)) return;
	
	var groupName = param.getParent().getParent().name;
	markGroupDirty(groupName);
}


function updatePatternForGroupContainer(groupC) {
	var modeC = groupC.mode;
	var adjustC = groupC.adjust;

	var groupID = getGroupID(groupC.name);
	var isPublic = 0;

	var page = modeC.page.get() - 1;
	var mode = modeC.mode.get() - 1;
	
	var actives = adjustC.enableAdjust.get() ? 62 : 0;
	var hue = parseInt(adjustC.hue.get() * 255);
	var saturation = parseInt(adjustC.saturation.get() * 255);
	var brightness = parseInt(adjustC.brightness.get() * 255);
	var speed = parseInt(adjustC.speed.get() * 255);
	var density = parseInt(adjustC.density.get() * 255);

	local.send("/pattern", groupID, isPublic, page, mode, actives, hue, saturation, brightness, speed, density);
}


function createGroups() {
	createGlobalGroup();
	
	for (var i=1; i <= numberOfGroupsParameter.get(); i++) {
		createGroup(groupPrefix + i);
	}

	removeGroups();
}

function createGlobalGroup() {
	createGroup(globalGroupName);
}

function createGroup(groupName) {
	if (groupExists(groupName)) return;

	var groupC = valuesPath.addContainer(groupName);
	groupC.setCollapsed(true);

	var modeC = groupC.addContainer("Mode");
	modeC.addIntParameter("Page","Page",1,1,13);
	modeC.addIntParameter("Mode","Page",3,1,11);
	
	var adjustC = groupC.addContainer("Adjust");
	adjustC.setCollapsed(true);
	adjustC.addBoolParameter("Enable Adjust", "Enable the adjusts.", false);
	adjustC.addFloatParameter("Brightness", "Brightness adjust", 0.1, 0, 1);
	adjustC.addFloatParameter("Hue", "Hue adjust", 0, 0, 1);
	adjustC.addFloatParameter("Saturation", "Saturation adjust", 1, 0, 1);
	adjustC.addFloatParameter("Speed", "Speed adjust", 0.5, 0, 1);
	adjustC.addFloatParameter("Density", "Density adjust", 1, 0, 1);

	script.log("Created Group " + groupName);
}


function removeGroups() {
	for(var i=numberOfGroupsParameter.get()+1; i<20; i++) {
		valuesPath.removeContainer(groupPrefix + i);
	}
}



////////////////////////
//Commands callbacks
////////////////////////

function wakeUp (group){
	script.log("Wake up");
	local.send("/wakeUp", group, 0);
}

function powerOff (group){
	script.log("Power off");
	local.send("/powerOff", group, 0);
}

function startSync (){
	script.log("Start sync");
	local.send("/startSync");
}

function stopSync (){
	script.log("Stop sync");
	local.send("/stopSync");
}

function resetSync (){
	script.log("Reset sync");
	local.send("/resetSync");
}

function pattern (groupID, page, mode, enableAdjust, brightness, hue, saturation, speed, density){
	script.log("Pattern");

	var groupC = getGroupContainer(groupID);

	groupC.mode.page.set(page);
	groupC.mode.mode.set(mode);

	groupC.adjust.enableAdjust.set(enableAdjust);
	groupC.adjust.brightness.set(brightness);
	groupC.adjust.hue.set(hue);
	groupC.adjust.saturation.set(saturation);
	groupC.adjust.speed.set(speed);
	groupC.adjust.density.set(density);
}

function adjustBrightness(groupID, value) {
	var groupC = getGroupContainer(groupID);
	groupC.adjust.brightness.set(value);
	groupC.adjust.enableAdjust.set(true);
}

function adjustHue(groupID, value) {
	var groupC = getGroupContainer(groupID);
	groupC.adjust.hue.set(value);
	groupC.adjust.enableAdjust.set(true);
}

function adjustSaturation(groupID, value) {
	var groupC = getGroupContainer(groupID);
	groupC.adjust.saturation.set(value);
	groupC.adjust.enableAdjust.set(true);
}

function adjustSpeed(groupID, value) {
	var groupC = getGroupContainer(groupID);
	groupC.adjust.speed.set(value);
	groupC.adjust.enableAdjust.set(true);
}

function adjustDensity(groupID, value) {
	var groupC = getGroupContainer(groupID);
	groupC.adjust.density.set(value);
	groupC.adjust.enableAdjust.set(true);
}

function setColor(groupID, color) {
	var groupC = getGroupContainer(groupID);
	var hsv = rgb2hsv(color[0], color[1], color[2]);

	groupC.adjust.hue.set(hsv[0]);
	groupC.adjust.saturation.set(hsv[1]);
	groupC.adjust.brightness.set(hsv[2]);

	groupC.mode.page.set(1);
	groupC.mode.mode.set(3);
	groupC.adjust.enableAdjust.set(true);
}


////////////////////////
// Helpers
////////////////////////

function markGroupDirty(groupName) {
	if (!keyExistsInArray(dirtyGroups, groupName)) {
		dirtyGroups.push(groupName);
	}
}

function keyExistsInArray(a, k) {
	for (var i=0; i<a.length; i++) {
		if (a[i] == k) return true;
	}

	return false;
}

function rgb2hsv (r,g,b) {
	var max = Math.max(Math.max(r, g), b);
	var min = Math.min(Math.min(r, g), b);
	var h, s, v = max;
  
	var d = max - min;
	s = max == 0 ? 0 : d / max;
  
	if (max == min) {
	  h = 0; // achromatic
	} else {
		if (max == r) h = (g - b) / d + (g < b ? 6 : 0);
		else if (max == g) h = (b - r) / d + 2; 
		else if (max == b) h = (r - g) / d + 4;
  
	  h /= 6;
	}
  
	return [ h, s, v ];
}


function getGroupID(groupName) {
	var isGlobalGroup = isGlobalGroup(groupName);
	var groupID = (isGlobalGroup) ? 0 : parseInt(groupName.replace(groupPrefix));
	return groupID;
}

function groupExists(groupName) {
	groupName = toLowerCamelCase(groupName);
	return valuesPath.getChild(groupName) != undefined;
}

function isGlobalGroup(groupName) {
	return groupName == globalGroupName;
}

function getGroupContainer(groupID) {
	var groupName = (groupID == 0) ? globalGroupName : groupPrefix + groupID;
	groupName = toLowerCamelCase(groupName);
	var groupC = local.getChild("values").getChild(groupName);
	
	return groupC;
}

function toLowerCamelCase(s) {
	var segments = s.split(" ");
	var result = segments[0].toLowerCase();
	
	for (var i=1; i<segments.length; i++) {
		result += capitalize(segments[i]);	
	}

	return result;
}

function capitalize(s) {
	if (typeof s !== 'string') return '';
	return s.charAt(0).toUpperCase() + s.substring(1,s.length);
}
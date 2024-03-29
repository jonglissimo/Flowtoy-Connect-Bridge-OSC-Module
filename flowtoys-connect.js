var parameterPath = local.parameters;
var valuesPath = local.values;
var lightsContainer;
var wakeUpTrigger = parameterPath.power.wakeUp;
var powerOffTrigger = parameterPath.power.powerOff;
var startSyncTrigger = parameterPath.sync.start;
var stopSyncTrigger = parameterPath.sync.stop;
var resetSyncTrigger = parameterPath.sync.reset;
var numberOfGroupsParameter = parameterPath.numberOfGroups;
var updateRateParameter = parameterPath.updateRate;

var globalGroupName = "Global group";
var globalGroupContainerName = "";
var groupPrefix = "Group ";
var dirtyGroups = [];


function init() {
	globalGroupContainerName = toLowerCamelCase(globalGroupName);

	updateRate();
	createGroups();
}

function update() {
	var globalGroupIndex = dirtyGroups.indexOf(globalGroupContainerName);
	var globalGroupIsIncluded = (globalGroupIndex > -1);

	if (globalGroupIsIncluded) { // first send to global group
		var groupC = local.getChild("values").getChild(globalGroupContainerName);
		updatePatternForGroupContainer(groupC);

		dirtyGroups.splice(globalGroupIndex); // remove global group 
	}

	for(var i=0; i < dirtyGroups.length; i++) { // then send to specific groups
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
	} else if (param.is(updateRateParameter)) {
		updateRate();
	}
}

function moduleValueChanged (param) { 
	if (param.is(local.outActivity)) return;
	
	var groupName = param.getParent().getParent().name;
	markGroupDirty(groupName);

	if (groupName == globalGroupContainerName) {
		var containerName = param.getParent().name;
		updateGlobalParameterForAllGroups(containerName, param.name, param.get());
	}
}


function updatePatternForGroupContainer(groupC) {
	var modeC = groupC.mode;
	var adjustC = groupC.adjust;

	var groupID = getGroupIDFromContainerName(groupC.name);
	var isPublic = 0;

	var page = modeC.page.get() - 1;
	var mode = modeC.mode.get() - 1;
	var maxBrightness = local.parameters.maxBrightness.get();

	var actives = adjustC.enableAdjust.get() ? 62 : 0;
	var hue = parseInt(adjustC.hue.get() * 255);
	var saturation = parseInt(adjustC.saturation.get() * 255);
	var brightness = parseInt(adjustC.brightness.get() * maxBrightness * 255);
	var speed = parseInt(adjustC.speed.get() * 255);
	var density = parseInt(adjustC.density.get() * 255);

	local.send("/pattern", groupID, isPublic, page, mode, actives, hue, saturation, brightness, speed, density);
}


function updateGlobalParameterForAllGroups(containerName, parameterName, value) {
	for (var i=1; i<= numberOfGroupsParameter.get(); i++) {
		var groupName = toLowerCamelCase(groupPrefix + i);
		var groupC = local.getChild("values").getChild(groupName);
		var parameter = groupC[containerName][parameterName];
		parameter.set(value);
	}
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
	
	var page = modeC.addIntParameter("Page","Page",1,1,13);
	page.setAttribute("alwaysNotify", true);
	page.setAttribute("saveValueOnly",false); 
	
	var mode = modeC.addIntParameter("Mode","Page",1,1,50);
	mode.setAttribute("alwaysNotify", true);
	mode.setAttribute("saveValueOnly",false);

	var adjustC = groupC.addContainer("Adjust");
	adjustC.setCollapsed(true);

	var enableAdjust = adjustC.addBoolParameter("Enable Adjust", "Enable the adjusts.", false);
	enableAdjust.setAttribute("alwaysNotify", true);
	enableAdjust.setAttribute("saveValueOnly",false); 

	var brightness = adjustC.addFloatParameter("Brightness", "Brightness adjust", 1, 0, 1);
	brightness.setAttribute("alwaysNotify", true);
	brightness.setAttribute("saveValueOnly",false); 

	var hue = adjustC.addFloatParameter("Hue", "Hue adjust", 0, 0, 1);
	hue.setAttribute("alwaysNotify", true);
	hue.setAttribute("saveValueOnly",false); 

	var saturation = adjustC.addFloatParameter("Saturation", "Saturation adjust", 1, 0, 1);
	saturation.setAttribute("alwaysNotify", true);
	saturation.setAttribute("saveValueOnly",false); 

	var speed = adjustC.addFloatParameter("Speed", "Speed adjust", 0.5, 0, 1);
	speed.setAttribute("alwaysNotify", true);
	speed.setAttribute("saveValueOnly",false); 

	var density = adjustC.addFloatParameter("Density", "Density adjust", 0.5, 0, 1);
	density.setAttribute("alwaysNotify", true);
	density.setAttribute("saveValueOnly",false); 

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
	local.send("/sync");
}

function stopSync (){
	script.log("Stop sync");
	local.send("/stopSync");
}

function resetSync (){
	script.log("Reset sync");
	local.send("/resetSync");
}

function changeMode (groupID, page, mode){
	var groupC = getGroupContainer(groupID);

	groupC.mode.page.set(page);
	groupC.mode.mode.set(mode);
}

function changeModeAndAdjust (groupID, page, mode, enableAdjust, brightness, hue, saturation, speed, density){
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

function adjust(groupID, adjustType, value) {
	var groupC = getGroupContainer(groupID);
	groupC.adjust[adjustType].set(value);
	groupC.adjust.enableAdjust.set(true);
}

function enableAdjust(groupID, value) {
	var groupC = getGroupContainer(groupID);
	groupC.adjust.enableAdjust.set(value);
}

function setColor(groupID, color) {
	var groupC = getGroupContainer(groupID);
	var hsv = rgb2hsv(color[0], color[1], color[2]);
	
	groupC.adjust.hue.set(hsv[0]);
	groupC.adjust.saturation.set(hsv[1]);
	groupC.adjust.brightness.set(hsv[2]);
	
	groupC.mode.page.set(3);
	groupC.mode.mode.set(8);
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

function getGroupIDFromContainerName (groupContainerName) {
	var isGlobalGroup = (groupContainerName == globalGroupContainerName);
	var groupID = (isGlobalGroup) ? 0 : parseInt(groupContainerName.replace("group", ""));
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

function updateRate() {
	script.setUpdateRate(updateRateParameter.get());
}
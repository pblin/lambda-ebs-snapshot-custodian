/*This Node.js Lambda Function does the following :
1. Retrieves the Meta Data for all Instances with the Tag 'snapshot' 
2. Creates a Snapshot for all Non Root Volume
3. Store the Meta Data for that Snapshot in the DynamoDB Table 'Snaps' [Please change Snaps to your DynamoDB Table Name
4. Reads the Tag SnapLifeTime tha stores the number of days this Snapshot must be stored for 
5. CloudWatch Events is used to schedule Snapshot Creations once per day. During this event CloudWatch Events calls this Lamda Function

AWS Services Used: 

a. EC2 : Instances exist only within EC2 today
b. Lambda : Runs This Function
c. DynamoDB : Stores Meta Data for Snapshots that are created
d. CloudWatch Events : Schedules and Triggers this script

*/

var AWS = require('aws-sdk');
var util = require('util');


//Variable Declaration for AWS API Libraries
var ec2 = new AWS.EC2({apiVersion: 'latest'});

const dynDB = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'}); //CHANGE 'us-west-2' TO YOUR REGION

exports.handler = (event, context, callback) => {


var icount = 0;
var op = 0;
var bp =[];
var tnum= -1;
var ace;
var snaps = [];
var vol;
var vparams;
var b=0;
var tagz;
var tag = [];
var uniqueArray = [];
var mrkr = 0;

//RETURNS ALL EC2 INSTANCE WITH THE TAG VALUE 'snapshot'. PLEASE CHANGE THIS TO YOUR TAG VALUE 
var param = { Filters: [ { Name: 'tag-value', Values: ['snapshot'] } ] }; 				
				
var request = ec2.describeInstances(param);

//array to hold object variables for param 
var snapshots = [];
var i = [];
var a = [];
var groot = [];
var glob = [];


request.on('success', function(response) {
   

 
	for( var item in response.data.Reservations) {  	
		var instances = response.data.Reservations[item].Instances;
		
		
		for ( var instance in instances) {
			
	
				var group = instances[instance]; //Variable holding the Instance MetaData
				var rootdev = instances[instance].RootDeviceName; //variable that holds the Root Device Name
				groot.push(rootdev); //Array that stores all RootDevice Name
			
				//Parsing of Instance Metatdata JSON file 
				var dat = JSON.stringify(group, 2);
				
				 var runner = JSON.parse(dat, (key, value)=>{
										
					
					
					if (key ==='DeviceName') //Checks for & Stores all Device Names in an array 'i'
					{
						ace = value.toString();
						i.push(ace);
					}
					
					if(key === 'VolumeId') //Checks for & Stores all Volume Id in the array 'a'
					{
						vol = value.toString();
						a.push(vol);
						icount++;		
					} 
					
					if(key === 'Key')
					{
						tagz = value.toString();
						
						
					}
					 
 //Checks for the TAG  : snaplifetime. This Tag contains the value of the length of time that a Snapshot of this Volume must be stored for 
					if((key === 'Value') && (tagz === 'snaplifetime')) 					{
						
						b = Number(value);
						
						for (sol = 0; sol < icount; ++sol)
						{
						
								tag.push(b); //
							
						}
						
						icount = 0;	
									
					} //Closes if((key === 'Value') && (tagz === 'snaplifetime'))
					
				
					
				}); //End of PARSING
				
		
		}
			
		
	}
	
	
	//Removing Duplicate items from the Array "groot" 
	uniqueArray = groot.filter(function(elem, pos) {
		return groot.indexOf(elem) == pos;
	});
	
	
	bp.push(uniqueArray.toString()) ;
	bp.join();
	//console.log(bp);
	
	
	
	
	// Looping through array "a" and  "i" and filtering out Root Devices
	for (numsnaps = 0; numsnaps < i.length; ++numsnaps) {
		
		
			
			if (bp[0].includes(i[numsnaps].toString())){
				
				mrkr = 0;
				
			}
			
			else { 
				
				++mrkr; 
							
			}
			
		
		if (Number(mrkr) >= 1) {
					
			var vict = a[numsnaps].toString();
			
			
			var params = {
				VolumeId: vict,			
				DryRun: false
				};
		
			
			ec2.createSnapshot(params, function(err, data) {
						
			if (err) console.log(err, err.stack); // an error occurred
			else { // successful response
					tnum = tnum+1;
					op = Number(tag[tnum]);				
				 vparams = {
					
					item: {
					
					SnapshotId: data.SnapshotId,
					VolumeId: data.VolumeId,
					State: data.State,
					StartTime: data.StartTime,
					OwnerId: data.OwnerId,
					VolumeSize: data.VolumeSize,
					Tags: data.Tags,
					Encrypted: data.Encrypted,
					Date: Date.now(),
					day: op
					
					
					
					},
					
					TableName: 'Snaps' /*  Please Remember to change 'Snaps' to your DynamoDB Table Name*/
					
					
					}; //Closes VPARAMS
					
					//Updates DynamoDB Table with the Meta Data for the Newly Created Snapshots
					dynDB.put(vparams, function(err, data) {
						if (err) console.log(err, err.stack); // an error occurred
						else { console.log('Successful Write!'); }

											
				}); //Closes DynamoDB PUT Call
				
					

				} // Closes the ELSE
				
				
				

				}); //Closes EC2.CreateSnapshot Function
				


			
				} //Closes if (Number(mrkr) >= 1) Function
		
	
		
				} // Closes for (numsnaps = 0; numsnaps < i.length; ++numsnaps) Function 
		
			
			//console.dir(tag);
				

			
  }). // ON.Request Function (Very First Function)


  on('error', function(response) {
    console.log("Error!");
  }).

send();
};
/***********************************************************************************************************
*Script for handling twkb-files through File API.
*Depends on 2 web worker scripts, find_bbox_worker.js and geom_worker.js
*The licence have 2 parts, please read then thorougly.
Part1
"Do what you want with it as long as you have good intentions"
Part 2
"Don't blame me if things go wrong"
************************************************************************************************************/

//Here we use IndexedDB for handling the attributes
var db; 
var layers={};
var request = indexedDB.open("the_db");
//Open database
request.onsuccess = function(event) {
	db = request.result;  	  
	db.onerror = function(event) {
		alert("Database error: " + event.target.errorCode);
	};  
};

//Number of web workers to use for calculating bounding boxes
const max_workers=7;

//Number of webworkers used for parsing the data when panning and zooming
const max_workers2=1;

//We store a reference to all web workers that we create to be able to terminate them properly
var w=[];
var webworkers ={"n":0, "w":w};//n: is number of created workers and w: is references to the workers in an array



//How big chunks to read from the twkb file 
const chunk_size=100000000;

//function for reading unsigned varint
function ReadVarInt64(ta_struct)
{
    cursor=ta_struct.cursor;
	nVal = 0;
    nShift = 0;

    while(1)
    {
        nByte = ta_struct.ta[cursor];
        if (!(nByte & 0x80))
        {
            cursor++;
	ta_struct.cursor=cursor;
            return nVal | (nByte << nShift);
        }
        nVal = nVal | (nByte & 0x7f) << nShift;
        cursor ++;
        nShift += 7;
    }
}


//This is where we start the bbox-calculations and index-building
function go()
{

	document.getElementById("knappen").style.background="#bb0000";

	the_file = document.getElementById("file_sel").files[0];
	layerName = the_name=the_file.name.split('.')[0];

	layers[layerName]={"the_file":the_file};

	var reader = new FileReader();
	reader.onload = function(e) 
	{
		scan_file(new Uint8Array(reader.result), layerName);
	}
	reader.readAsArrayBuffer(the_file);
}

//This seems nessecery to get back memory
function terminate_workers()
{
	while (webworkers.n>0)
	{
		var w = webworkers.w[--webworkers.n];
		w.terminate();
	}
}



/*Scan the twkb-file and distribute the work to be done to web workers.
ta is the binary data and the_file is a reference to the file.
*/
function scan_file(ta,the_file)
{
	var ta_struct={};
	
	ta_struct.ta=ta;
	ta_struct.cursor=0;
	var start_cursor=0;
	var n_workers=0;
	var n=0;
	var antal_klara=0;
	var num=0;
	var tree=rbush(20);
	var the_size;
	//The length of the whole binary data bulk
	var the_length=ta.byteLength;
	
	var size_per_worker=the_length/max_workers;

	if(the_length==0)
		return 0;
		
//We check if the first byte flag shows that we have sizes. If the first geometry has sizes we asssume all have
	var flag = ta[ta_struct.cursor];
	if(!(flag&0x02))
		return 0;
	
	while(ta_struct.cursor<the_length)
	{	
		n++
		//we just jump over the first byte
		ta_struct.cursor++;
		
		//Read the geometry size
		the_size=ReadVarInt64(ta_struct);
		//Jump to the start of the next geoemtry
		ta_struct.cursor+=the_size;
		
		//Check if we have enough data to send to a worker
		if(((ta_struct.cursor-start_cursor)>=size_per_worker)||(ta_struct.cursor==the_length))
		{

			var worker = webworkers.w[webworkers.n++] = new Worker('find_bbox_worker.js');
			 
			worker.onmessage = function(e) {
				tree.load(e.data);
				num++;
				if(num==n_workers)
				{
					index_ok();
					terminate_workers();
				}
			  };

			  worker.onerror = function(e) {
			    document.querySelector('#error').textContent = [
				'ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join('');
			  };
			  n_workers++;
			 worker.postMessage({"the_file":layers[the_file].the_file,"start":start_cursor,"end":ta_struct.cursor,"n_geometries":n});
			  start_cursor=ta_struct.cursor; 
		}
	}
	//Store the index so we can create more indexes for more layers
	layers[the_file].index=tree;
	delete ta_struct;
}
  
  
  
/*Here we get when the map is zoomed or panned if we are enough zoomed in*/
function search_bbox( boxen)
{
	var norm_bbox = JSON.parse(boxen);
	
	/*This is for transforming to pixels, but here and now Leaflet takes care of that*/
//	var pixel_length=(norm_bbox[2]-norm_bbox[0])/s_w ;
	var pixel_length=0;
	var s_h=0;
	transform_values={"min_x":norm_bbox[0], "min_y":norm_bbox[1],"pixel_length":pixel_length, "screen_height":s_h};

	//Clean and remove the map when a redraw is needed
	kartan.clearLayers();
	map.removeLayer(kartan); 

	for (var layer in layers)
	{
		//Do the search in the spatial index
		var res=layers[layer].index.search(norm_bbox);
		
		//Order the result, or the reading in the twkb-file will be messed up
		res.sort(function(a,b){return(a[4]-b[4])});
		
		var len=res.length;
		
		if(len>0)//If we had any hits.
		{
		//Now we are going to read the file in chunks. It is for memory reasons
			var hit_list=[];

			var antal = 0;

			var chunk=[-1,-1];//First value is start of chunk and last value is where chunk stops

			//Jump through the hit list
			for (var r=0;r<len;r++)
			{
				//Set the start of our chunk in the beginning of our first hit
				if(chunk[0]<0)
					chunk[0]=res[r][4];
					
				//Put the hit in a hit list
				hit_list.push(res[r][4]-chunk[0]); //we substract the length of the file that is before this chunk
				
				//If the next comming geometry gives a chunk bigger than the max_size that we defined in the "chunk_size" constant or if we have reached the end of the result list....
				if(((r+1)<len && ((res[r+1][4]+res[r+1][5])-chunk[0]>chunk_size))||(r==(len-1)))
				{
					//register the end of the bulk in the file
					chunk[1]=res[r][4]+res[r][5];
					
					//send the parsing work to a web worker
						var worker = webworkers.w[webworkers.n++] = new Worker('geom_worker.js');
					//When we get the coordinate list back from parsing...
						worker.onmessage = function(e) {
							if(e.data &&e.data.coords)
							{
								the_layer=e.data.layer;
								var id=e.data.id.toString();
								
								//Check the id against the attribute table for styling
								if(db.objectStoreNames.contains(the_layer))
								{
									var request = db.transaction([the_layer]).objectStore(the_layer).get(id);
								
								request.onerror=function(){
									alert("error");
								}
								request.onsuccess = function(happening) 
								{
									  if(happening.target.result)
										the_style= styles[the_layer].kode[happening.target.result.kod];
									  else
										the_style={smoothFactor:1,weight:1,color: '#000099',fillOpacity:0.1};
								  
								  
									if(e.data &&e.data.coords){
											switch (e.data.type){											
											case "line":
												kartan.addLayer(L.polyline(e.data.coords, the_style));
											break;
											case "polygon":
												kartan.addLayer(L.polygon(e.data.coords,the_style));//{smoothFactor:1,weight:1,color: 'red',fillOpacity:0.03}));
											break;
											}
										}
								}	
								}
								else
								{
										the_style={smoothFactor:1,weight:1,color: '#000099',fillOpacity:0.1};
								  
								  
									if(e.data &&e.data.coords){
											switch (e.data.type){											
											case "line":
												kartan.addLayer(L.polyline(e.data.coords, the_style));
											break;
											case "polygon":
												kartan.addLayer(L.polygon(e.data.coords,the_style));//{smoothFactor:1,weight:1,color: 'red',fillOpacity:0.03}));
											break;
											}
										}
								
								
								}
								
							};	
								if (e.data.type=="log")
									console.log(e.data.log);
						}						
					
					worker.postMessage({"the_file":layers[layer].the_file,"layer":layer,"chunk":chunk,"hit_list":hit_list,"transform_values":transform_values});
				
				//if((r+1)<len)
					chunk[0]=-1;
					delete hit_list;
					var hit_list=[];
				
				}
			}
				kartan.addTo(map);
		}
	}	 
}
	

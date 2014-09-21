


var d = new Date();
var  tid=[];
var timing = {};
var geoms=0; // just to make it global
//var ta = 0;
var box_list=[];
var min_int32=-999999999;
var max_int32=999999999;

	
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
 function ReadVarSInt64(ta_struct)
{
    nVal = ReadVarInt64(ta_struct);
//	console.log('utan zig-zag%d',nVal);
    /* un-zig-zag-ging */
    if ((nVal & 1) == 0) 
        return ((nVal) >> 1);
    else
        return -(nVal >> 1)-1;
}

function read_pa(ta_struct)
{
	ta_struct.coords=[];
	var ndims=ta_struct.ndims;
	var factor=ta_struct.factor;
	var npoints=ta_struct.npoints;
	var coords=[];
	ta_struct.coords[0]=[];
	
	for (i =0;i<(npoints);i++)
	{
		ta_struct.coords[i]=[];
		for (j =0;j<(ndims);j++)
		{
			ta_struct.refpoint[j]+=ReadVarSInt64(ta_struct);
			ta_struct.coords[i][j]=ta_struct.refpoint[j]/factor;	
			//find bbox
			if(ta_struct.coords[i][j]<ta_struct.bbox[j])
				ta_struct.bbox[j]=ta_struct.coords[i][j];
			if(ta_struct.coords[i][j]>ta_struct.bbox[j+ndims])
				ta_struct.bbox[j+ndims]=ta_struct.coords[i][j];
			
	//console.log('i=%d, j=%d, val=%s, ta_struct.cursor=%d',i,j,ta_struct.coords[0][j],ta_struct.cursor);			
		}
	}
	return 0;	
}


function parse_point(ta_struct)
{	
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);
	ta_struct.npoints=1;
	read_pa(ta_struct);

}
function parse_line(ta_struct)
{		
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);	
	ta_struct.npoints=ReadVarInt64(ta_struct);
	read_pa(ta_struct);	
}
function parse_polygon(ta_struct)
{
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);
		
	nrings=ReadVarInt64(ta_struct);
	for (ring=0;ring<nrings;ring++)
	{		
		ta_struct.npoints=ReadVarInt64(ta_struct);
		read_pa(ta_struct);
	}
	
}
	
function parse_multipoint(ta_struct)
{
	
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);		

	ta_struct.npoints=ReadVarInt64(ta_struct);
		
	read_pa(ta_struct);
}	

	
function parse_multiline(ta_struct)
{	
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);				
	
	ngeoms=ReadVarInt64(ta_struct);	
	
	for (geom=0;geom<ngeoms;geom++)
	{		
		ta_struct.npoints=ReadVarInt64(ta_struct);
		read_pa(ta_struct);
	}
}	
	
	
function parse_multipolygon(ta_struct)
{
	
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);			

	ngeoms=ReadVarInt64(ta_struct);
	
	for (geom=0;geom<ngeoms;geom++)
	{		
		nrings=ReadVarInt64(ta_struct);
		
		for (ring=0;ring<nrings;ring++)
		{
			ta_struct.npoints=ReadVarInt64(ta_struct);
			read_pa(ta_struct);
		}
	}
}	

function parse_agg_point(ta_struct)
{
	var n_geometries=ReadVarInt64(ta_struct);
	for (t=0;t<n_geometries;t++)
	{		
		parse_point(ta_struct);		
		
	}
}	
function parse_agg_line(ta_struct)
{
	var n_geometries=ReadVarInt64(ta_struct);	
	for (t=0;t<n_geometries;t++)
	{
		parse_line(ta_struct);
	}
}	
function parse_agg_polygon(ta_struct)
{
	var n_geometries=ReadVarInt64(ta_struct);
	for (t=0;t<n_geometries;t++)
	{
		parse_polygon(ta_struct);
	}
}	


function parse_binary(ta, start)
{
	var nrings=1;
	var start_cursor;
	//The length of the whole binary data bulk
	var the_length=ta.byteLength;
		
	//alert("total length="+the_length);
	var ta_struct = {};
	ta_struct.ta=ta;
	ta_struct.cursor = 0;
	/*This variable will carry the last refpoint in a pointarray to the next pointarray. It will hold one value per dimmension. For now we just give it the min INT32 number to indicate that we don't have a refpoint yet*/
	ta_struct.refpoint = new Int32Array(4);
		
	/*An array for a 2d bounding box.*/
	ta_struct.bbox = new Float32Array(8);
	var n = 0;
	while(ta_struct.cursor<the_length)
	{
		start_cursor=ta_struct.cursor; //for use in index
		//The first byte contains information about endianess and the precission of the coordinates
		var flag = ta[ta_struct.cursor];
		ta_struct.cursor ++;
			
		/*1 if ID is used, 0 if not*/
		ta_struct.id=flag&0x01;
		
		/*1 if there is sizes, 0 if not*/
		ta_struct.sizes=flag&0x02;		
		
		/*precission gives the factor to divide the coordinate with, giving the right value and number of deciamal digits*/
		var precision=(flag&0xF0)>>4;
		ta_struct.factor=Math.pow(10,precision);
		
		if(ta_struct.sizes)
			the_size=ReadVarInt64(ta_struct);

		
		/*Here comes a byte containgin type and number of dimmension information*/
		var flag = ta[ta_struct.cursor];
		ta_struct.cursor++;
			
		var typ=flag&0x1F;	
		ta_struct.ndims=(flag&0xE0)>>5;	
				// we store each geoemtry in a object, "geom"

		
		//reset refpoint and bbox
		for (var d=0;d<ta_struct.ndims;d++)
		{
			ta_struct.refpoint[d]=0;

			ta_struct.bbox[d]=max_int32; //min values for each dimmension...
			ta_struct.bbox[d+ta_struct.ndims]=min_int32; //followed by max values for each dimmension
		}

	//	ta_struct={"method":method,"ta":ta,"ndims":ndims,"cursor":cursor, "little":little, "factor":factor, "refpoint":refpoint};
		
		
		/*If POINT*/			
		if(typ==1)
		{
			parse_point(ta_struct);
			n++			;
		}			
		/*if LINESTRING*/
		else if(typ==2)
		{
			parse_line(ta_struct);
			n++;
		}		
		/*if POLYGON*/
		else if(typ==3)
		{	
			parse_polygon(ta_struct);
			n++;
		}		
		/*if MultiPOINT*/
		else if(typ==4)
		{
			parse_multipoint(ta_struct);
			n++;
		}			
		/*if MultiLINESTRING*/
		else if(typ==5)
		{
			parse_multiline(ta_struct);
			n++;
		}		
		/*if MultiPOLYGON*/
		else if(typ==6)
		{	
			parse_multipolygon(ta_struct);
			n++;
		}
		/*if aggregated POINT*/
		else if(typ==21)
		{
			parse_agg_point(ta_struct);
		}	
		
		/*if aggregated LINESTRING*/
		else if(typ==22)
		{
			parse_agg_line(ta_struct);
		}		
		/*if aggregated POLYGON*/
		else if(typ==23)
		{	
			parse_agg_polygon(ta_struct);
		}
		if(n>1870)
			n=n;
var box = [ta_struct.bbox[0],ta_struct.bbox[1],ta_struct.bbox[2],ta_struct.bbox[3],start_cursor+start, ta_struct.cursor-start_cursor];
		box_list.push(box)
		
	}
	self.postMessage(box_list);
delete ta_struct;	
}

self.addEventListener('message', function(e) {
  var the_file = e.data.the_file;
  var start = e.data.start;
  var end = e.data.end;

  // Read each file synchronously as an ArrayBuffer and
  // stash it in a global array to return to the main app.
				


   var reader = new FileReaderSync();
	var blob = the_file.slice(start, end);
   // reader.readAsBinaryString(blob);
		parse_binary(ta = new Uint8Array(reader.readAsArrayBuffer(blob)),start);
	delete blob;
		self.close;
	//	postMessage("klart");
	

}, false);


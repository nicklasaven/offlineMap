
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
    /* un-zig-zag-ging */
    if ((nVal & 1) == 0) 
        return ((nVal) >> 1);
    else
        return -(nVal >> 1)-1;
}

function read_pa(ta_struct)
{

	var ndims=ta_struct.ndims;
	var factor=ta_struct.factor;
	var npoints=ta_struct.npoints;
	ta_struct.coords=[];
	
for (i =0;i<(npoints);i++)
{
	ta_struct.coords[i]=[];
	for (j =ndims-1;j>=0;j--)
	{
		ta_struct.refpoint[j]+=ReadVarSInt64(ta_struct);
		ta_struct.coords[i][j]=ta_struct.refpoint[j]/factor;				
	}
}	
	return 0;	
}



function parse_point(ta_struct,layer,render)
{	
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);
	ta_struct.npoints=1;
	read_pa(ta_struct);
	if(render)
		self.postMessage({"coords":ta_struct.coords,"type":"point","layer":layer});	
	self.postMessage({"type":"counter","npoints":ta_struct.npoints});
}
function parse_line(ta_struct,layer,render)
{		
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);	
	ta_struct.npoints=ReadVarInt64(ta_struct);
	read_pa(ta_struct);	
	if(render)
		self.postMessage({"id":id,"coords":ta_struct.coords,"type":"line","layer":layer});
	self.postMessage({"type":"counter","npoints":ta_struct.npoints});
}
function parse_polygon(ta_struct,layer,render)
{

	if(ta_struct.id)
		var id=ReadVarSInt64(ta_struct);		
	nrings=ReadVarInt64(ta_struct);
	var rings=[];
	for (var ring=0;ring<nrings;ring++)
	{		
		ta_struct.npoints=ReadVarInt64(ta_struct);
		read_pa(ta_struct);
		rings.push(ta_struct.coords);
	}
	if(render)
		self.postMessage({"id":id,"coords":rings,"type":"polygon","layer":layer});	
	self.postMessage({"type":"counter","npoints":ta_struct.npoints});
}
	
function parse_multipoint(ta_struct,layer,render)
{
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);		

	ta_struct.npoints=ReadVarInt64(ta_struct);
		
	read_pa(ta_struct);
	if(render)
		self.postMessage({"id":id,"coords":ta_struct.coords,"type":"multipoint","layer":layer});
	self.postMessage({"type":"counter","npoints":ta_struct.npoints});
}	

	
function parse_multiline(ta_struct,layer,render)
{	
	var npoints;
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);				
	
	var ngeoms=ReadVarInt64(ta_struct);
	
	for (geom=0;geom<ngeoms;geom++)
	{		
		ta_struct.npoints=ReadVarInt64(ta_struct);
		npoints+=ta_struct.npoints;
		read_pa(ta_struct);
		if(render)
			self.postMessage({"id":id,"coords":ta_struct.coords,"type":"line","layer":layer});
	}
	self.postMessage({"type":"counter","npoints":ta_struct.npoints});
}	
	
	
function parse_multipolygon(ta_struct,layer,render)
{
	var npoints;
	if(ta_struct.id)
		id=ReadVarSInt64(ta_struct);			

	var ngeoms=ReadVarInt64(ta_struct);
	
	for (geom=0;geom<ngeoms;geom++)
	{		
		var nrings=ReadVarInt64(ta_struct);
		var rings=[];
		for (ring=0;ring<nrings;ring++)
		{
			ta_struct.npoints=ReadVarInt64(ta_struct);
			npoints+=ta_struct.npoints;
			read_pa(ta_struct);
			rings.push(ta_struct.coords);

		}
		if(render)
			self.postMessage({"id":id,"coords":rings,"type":"polygon","layer":layer});
	}
	self.postMessage({"type":"counter","npoints":ta_struct.npoints});
}	

function parse_agg_point(ta_struct,layer,render)
{
	var n_geometries=ReadVarInt64(ta_struct);
	for (t=0;t<n_geometries;t++)
	{			
		parse_point(ta_struct,layer);		
	}
}	
function parse_agg_line(ta_struct,layer,render)
{
	var n_geometries=ReadVarInt64(ta_struct);	
	for (t=0;t<n_geometries;t++)
	{
		parse_line(ta_struct,layer);
	}
}	
function parse_agg_polygon(ta_struct,layer,render)
{
	var n_geometries=ReadVarInt64(ta_struct);
	for (t=0;t<n_geometries;t++)
	{
		parse_polygon(ta_struct,layer);
	}
}	


function parse_binary(ta,hit_list,transform_values,layer,render)
{

	//The length of the whole binary data bulk
	var the_length=ta.byteLength;
		
	var ta_struct = {};
	ta_struct.ta=ta;
	ta_struct.cursor = 0;
	/*This variable will carry the last refpoint in a pointarray to the next pointarray. It will hold one value per dimmension. For now we just give it the min INT32 number to indicate that we don't have a refpoint yet*/
	ta_struct.refpoint = new Int32Array(4);
	
	//This is values used to transform coordinates to screen-pixels
	ta_struct.transform_values=transform_values;
		
	var n = 0;
	for (var hit=0,len=hit_list.length;hit<len;hit++)
	{
		ta_struct.cursor=hit_list[hit];
		
		//The first byte contains information about if there is id and geometry size delivered and in what precission the data is
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
		}

		
		/*If POINT*/			
		if(typ==1)
		{
			parse_point(ta_struct,layer,render);
			n++			;
		}			
		/*if LINESTRING*/
		else if(typ==2)
		{
			parse_line(ta_struct,layer,render);
			n++;
		}		
		/*if POLYGON*/
		else if(typ==3)
		{	
			parse_polygon(ta_struct,layer,render);
			n++;
		}		
		/*if MultiPOINT*/
		else if(typ==4)
		{
			parse_multipoint(ta_struct,layer,render);
			n++;
		}			
		/*if MultiLINESTRING*/
		else if(typ==5)
		{
			parse_multiline(ta_struct,layer,render);
			n++;
		}		
		/*if MultiPOLYGON*/
		else if(typ==6)
		{	
			parse_multipolygon(ta_struct,layer,render);
			n++;
		}
		/*if aggregated POINT*/
		else if(typ==21)
		{
			parse_agg_point(ta_struct,layer,render);
		}	
		
		/*if aggregated LINESTRING*/
		else if(typ==22)
		{
			parse_agg_line(ta_struct,layer,render);
		}		
		/*if aggregated POLYGON*/
		else if(typ==23)
		{	
			parse_agg_polygon(ta_struct,layer,render);
		}
		
	}
delete ta_struct;
}





self.addEventListener('message', function(e) {
  var the_file = e.data.the_file;
  var hit_list= e.data.hit_list;
var chunk = e.data.chunk;
var layer = e.data.layer;
var render = e.data.render;
  var transform_values = e.data.transform_values;
	var start=chunk[0];
	var end=chunk[1];
	var blob=0;
  // Read each file synchronously as an ArrayBuffer and
				

	
   var reader = new FileReaderSync();

		parse_binary(new Uint8Array(reader.readAsArrayBuffer(the_file.slice(start, end))),hit_list,transform_values,layer,render);

	delete blob;
		self.close;
}, false);


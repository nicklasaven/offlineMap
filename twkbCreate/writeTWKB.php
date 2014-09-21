<?php
/************************************************************
/Nicklas Avén 
nicklas.aven@jordogskog.no
'***********************************************************/

// open a connection to the database server
$connection = pg_connect ("host=127.0.0.1 dbname=myMaps user=myUser password=myPassword port=5432");
if (!$connection)
{
	die("Could not open connection to database server");
}

$thesql="set bytea_output='escape';select st_astwkb(st_transform(geom,4326),5,gid,true) from hedmark;";

$thetable = pg_query($connection,$thesql ) or die("databasproblem:SQL=".$the_sql."error:".pg_last_error($connection));

$filename = 'hedmark.twkb';

//Open with binary flag
if (!$handle = fopen($filename, 'w+b')) {
 echo "Cannot open file ($filename)";
 exit;
}


while ($row = pg_fetch_row($thetable)) {
    // Write the TWKB geometries to the file
    if (fwrite($handle, pg_unescape_bytea($row[0])) === FALSE) {
        echo "Cannot write to file ($filename)";
        exit;
    }
}
    fclose($handle);

echo "Succsess!";

pg_close($connection);
exit;
?>				

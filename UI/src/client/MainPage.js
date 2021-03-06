import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Button from '@material-ui/core/Button';
import Avatar from '@material-ui/core/Avatar';
import IconButton from '@material-ui/core/IconButton';
import { red } from '@material-ui/core/colors';
import MoreVertIcon from '@material-ui/icons/MoreVert';
//import initializeData from '../data/initializeData';
import APIStatus from './APIStatus';
import ErrorPage from './ErrorPage';
//import Refresh from '@material-ui/icons/Refresh';

const useStyles = makeStyles(theme => ({
    root1: {
      flexGrow: 1,
      margin: 'auto',
      padding: 30,
      display: 'flex',
      flexWrap: 'wrap',
      overflow: 'hidden',
      backgroundColor: theme.palette.background.root,
    },
    root: {
      color: theme.palette.background.root,
      backgroundColor: theme.palette.background.root,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      flexGrow: 1,
      [theme.breakpoints.up('sm')]: {
        height: '80vh',
        minHeight: 750,
        maxHeight: 1200,
      },
    },
    paper: {
      padding: theme.spacing(1),
      margin: 'auto',
      maxWidth: 800,
      backgroundColor: theme.palette.background.root,
    },
    card: {
      width: 320,
      margin: 'auto'
    },
    cardactions: {
      backgroundColor: "#E0F2F1"
    },
    cardcontent: {
      height: 40,
    },
    media: {
      margin: 'auto',
      width: 120,
      height: 110,
    },
    avatar: {
      backgroundColor: red[500],
    },
    cardheader: {
      height: 20,
    },
    snackbarcontent: {
      margin: theme.spacing(1),
    },
}));

//const reinitialize_lag_ms = 60000
const TICK_COUNT=30
const io = require('socket.io-client');
let OBJ_DET_SERVER_URL = 'http://localhost:8080';

if (process.env.REACT_APP_API_SERVER_URL !== "") {
  OBJ_DET_SERVER_URL=process.env.REACT_APP_API_SERVER_URL
} else{
  OBJ_DET_SERVER_URL='http://localhost:8080'
}



const offline_color = "#F5F5F5";
const online_color = "#81C784";
const default_data = {  status: 'Not detected',
                        statusColor: '#F5F5F5',
                      }

const socket = io(OBJ_DET_SERVER_URL,
                  { reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax : 5000,
                    reconnectionAttempts: 99999
                  }
);

export default function MainPage() {
  const classes = useStyles();
  const [source, setSource] = useState({});
  const [hasError, setHasError] = useState({"api":false,"esp":false});
  const [espActive, setESPActive] = useState(false);
  const [clientData, setClientData] = useState({"data":[],"latest_update_time": 0,"previous_update_time": 0});



  useEffect(() => {

    function pollData() {
        //console.log(hasError);
        if(espActive){
          //let newDataRecvd = false;
          let previous_data_recv_time = 0
          //get latest_data_recv_time
          let latest_data_recv_time = clientData["latest_data_recv_time"];

          //add new property
          if(!clientData.hasOwnProperty('previous_data_recv_time')){
            clientData["previous_update_time"] = clientData["latest_data_recv_time"];
          }

          //New data received
          if(latest_data_recv_time > previous_data_recv_time){
            clientData["previous_data_recv_time"] = clientData["latest_data_recv_time"];
          } else{
            //empty
          }
          let newClientData = clientData["data"].map(function(item){

                if(!item.hasOwnProperty('tickCount')){
                  item["tickCount"] = 0;
                }

                if(!item.hasOwnProperty('previous_detect_time')){
                  item["previous_detect_time"] = item["latest_detect_time"];
                }

                if(item["last_statusColor"] === online_color){ //if online
                  item["tickCount"] = item["tickCount"]+1;
                }

                // Check Tick count expired
                if(item["tickCount"] > TICK_COUNT ){
                  item["tickCount"] = 0;

                  // Reset as tick expired
                  if(!(item["previous_detect_time"] < item["latest_detect_time"])){
                    item = {...item, "status": default_data["status"],
                                     "statusColor": default_data["statusColor"],
                                     "recommendation": default_data["recommendation"],
                           };
                  }

                }

                // Start from fresh
                if(item["tickCount"] === 0 ){
                  // Sync last data with current data
                  item = {...item, "last_status": item["status"],
                                   "last_statusColor": item["statusColor"],
                                   "last_recommendation": item["recommendation"],
                                   "previous_detect_time": item["latest_detect_time"],
                         };
                }
                return item;
            });
          setESPActive(false)
          setClientData({...clientData, "data": newClientData});
        }
    }
    let id = setInterval(() => {
      pollData()
    }, 150);
    return () => clearInterval(id);
  });


  //get real time feed from esp
  useEffect(() => {

      //console.log('socket effect')
      socket.on('broadcast', function(data){
        setSource(data);
        setESPActive(true)
      });

      //console.log(socket)
      socket.on('disconnect', function(){
        setClientData({"data":[]})
        setESPActive(false)
      });
      socket.on('connect_error', function (data) {
        //console.log('connection_error');
        setESPActive(false)
        //setHasError({...hasError,"esp": true});
      });

      return () => {
        socket.off("broadcast");
        socket.off("disconnect");
      };
  });

  useEffect(() => {
  return () => {
    console.log('will unmount');
    }
  }, []);


  useEffect(() => {
    //console.log("get initial data")
    // Run! Get some initial data from API.
    //console.log(OBJ_DET_SERVER_URL+'/customer/initial')
    fetch(OBJ_DET_SERVER_URL+'/customer/initial')
      .then(response => response.json())
      .then(function(jsondata) {
        //console.log(jsondata);
        setHasError({...hasError,"api": false});
        //console.log({...clientData, "data": jsondata})
        setClientData({...clientData, "data": jsondata});
      })
      .catch(function(error) {
        //console.log(error);
        setHasError({...hasError,"api": true});
      });
  }, []);



  useEffect(() => {
    // data received from socket
    //console.log(source)
    var serverData = [source]
    var newdata = []
    // get current time
    let latest_data_recv_time = new Date();
    if(source){
        //console.log(source)
        //{id: "2518931540", timestamp: "2019-09-05T00:53:34.289Z", object_name: "Plant", object_likelihood: "0.206587"}
        newdata = clientData["data"].map(function(item){
          //Key detection line
        var found = serverData.find(src => src.name === item.name);
        if(!found){
          // object not detected - reset object status
          item = {...item, "status": default_data["status"],
                           "statusColor": default_data["statusColor"],
                           "recommendation": default_data["recommendation"],
                 };
          item["statusColor"] = offline_color;
        } else{
          // object detected - set detect time
          item["statusColor"] = online_color;
          item["latest_detect_time"] = new Intl.DateTimeFormat('en-AU',
                                                               { year: 'numeric',
                                                                 month: '2-digit',
                                                                 day: '2-digit',
                                                                 hour: '2-digit',
                                                                 minute: '2-digit',
                                                                 second: '2-digit'}).format(Date.now());
        }
        return found ? Object.assign(item, found) : {...item};
      });
      setClientData({...clientData, "data":newdata,"latest_data_recv_time": latest_data_recv_time})

    } //end if
  }, [source]); //only re-run the effect if new message comes in


  const ObjectListResults = () => {
    return (
      <React.Fragment>
      <Grid container spacing={2} justify="center" >
      {clientData["data"].map(tile => (
        <Grid item>
        <Card className={classes.card} >
            <CardHeader
               className={classes.cardheader}
               avatar={
                 <Avatar aria-label="recipe" className={classes.avatar}>
                   {tile.name ? tile.name.charAt(0).toUpperCase() : 'N'}
                 </Avatar>
               }
               action={
                 <IconButton aria-label="settings">
                   <MoreVertIcon />
                 </IconButton>
               }
               title="Last Detected"
               subheader={tile.latest_detect_time}
             />
            <CardActionArea style={{backgroundColor: tile.last_statusColor}}>
              <CardMedia
                wide
                className={classes.media}
                image={tile.profilepicture}
                title="Demo image"
              />
              <CardContent>
                <Typography gutterBottom variant="h5" component="h2">
                  {tile.name} - {tile.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" component="p" className={classes.cardcontent}>
                  {tile.last_recommendation}
                </Typography>
              </CardContent>
          </CardActionArea>
          <CardActions className={classes.cardactions}>
            <Button size="small" color="primary">
              {tile.last_status}
            </Button>
            <Button size="small" color="primary">
              Learn More
            </Button>
          </CardActions>
        </Card>
        </Grid>
    ))}
    </Grid>
    </React.Fragment>
    );
  }



  return (
    <div className={classes.root}>
      <APIStatus/>
      <Paper className={classes.paper} elevation={0}>
      {
        hasError["api"]
        ? (
            <ErrorPage/>)
        : (
              <ObjectListResults/>
            )
      }
      </Paper>
    </div>
  );
}

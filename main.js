var http                  = require('http');
var app                   = http.createServer(handler);
var chat_sessions         = [];
var connections           = [];
var connections_to_client = [];
var fs                    = require('fs');
var host                  = "localhost";
var io                    = require('socket.io')(app);
var message_helper        = require("./message_helpers.js");
var port                  = 3006;
var users                 = [];
var request               = require('request');

app.listen(port, host);

function handler (req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }

            res.writeHead(200);
            res.end(data);
        });
}

io.on('connection', function (socket) {

    // make api request to get user details
    // create connection object
    // send alert message
    // send a broadcast to everyone letting
    // them know of new user connections and chat sessions

    socket.on('register', function (data) {
        request("http://gbc.lvh.me:3000/api/v1/chat/users/" + data.user_id, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                    register(body, data, socket);
            }
        });

    });

    socket.on('supervisor-message', function(data){

        // no chat session i.e new message
        if (data.chat_session_id == 0){
            //handles messages sent by supervisors
            request.post({url:'http://gbc.lvh.me:3000/api/v1/chat/chat_sessions',
                    form: {
                        chat_session: {
                            user_id: data.target_id,
                            supervisor_id: data.sender_id,
                            notes: "notes"}
                    }},
                function(err,httpResponse,body){
                    var session = JSON.parse(body)['chat_session'];
                    // should be target
                    var destination_socket = message_helper.get_socket(connections, data.sender_id);
                    session['current'] = true;
                    chat_sessions.push(session);
                    message_helper.update_connections(connections, connections_to_client);
                    save_message(session.id, data.message);
                    announce();
                    destination_socket.emit('message',
                        { sender_id: data.sender_id,
                            message: data.message,
                            chat_session_id: session.id
                        });

                })
        } else {
            save_message(data.chat_session_id, data.message);
            update_current_session(data.chat_session_id, data.sender_id);
            var destination_socket = message_helper.get_socket(connections, data.sender_id); // should be target
            destination_socket.emit('message',
                { sender_id: data.sender_id,
                    message: data.message,
                    chat_session_id: data.chat_session_id
                });
        }
    });

    socket.on('user-message', function(data){

    });
    
    socket.on('escalation-request', function(data){
        var destination = message_helper.get_socket(connections, data.target_id)
        destination.emit('escalation-invitation',
            { sender_id: data.sender_id, user_id: data.user_id });

    });

    socket.on('escalation-response', function(data){
        if(data.accepted == true) {

            // close session with previous operator
            // send alert to user
            // supervisor sends a message
            console.log('test');
        }
        else {
            var destination = message_helper.get_socket(connections, data.requested_by_id)
            destination.emit('escalation-rejection',
                { sender_id: data.sender_id, user_id: data.user_id });
        }
    });

    socket.on('disconnect', function(){

        //remove dead connections and close sessions
        for (var i = 0; i < connections.length; i++) if (!connections[i].socket.connected) {
            id = connections[i].id;
            role = connections[i].role;
            connections.splice(i, 1);
            connections_to_client.splice(i, 1);
            close_session(session_to_close(id, role));
        }

    });
});

function announce(){
    io.emit('advertise', {
        waiting: message_helper.waiting(connections_to_client),
        chatting:  message_helper.add_user_details(
            message_helper.supervisor(
                connections_to_client, users, chat_sessions), users, chat_sessions) });
}

function close_session(session){
    request.put({url:"http://gbc.lvh.me:3000/api/v1/chat/chat_sessions" + session.id,
            form: {}  },
        function(err,httpResponse,body){
            if (err) {
                console.error('update failed:', err);
            }else {
                console.log('session updated');
            }
            announce();
        }
    )

}

function register(body, data, socket) {
    details = JSON.parse(body);
    users.push(details["user"]);
    connections.push({
        id: data.user_id,
        socket: socket,
        in_session: false,
        role: details["user"]["role"]
    });
    connections_to_client.push({
        id: data.user_id,
        mood: data.mood,
        in_session: false,
        role: details["user"]["role"]
    });
    socket.emit('alert', { message: 'You have been connected!'})
    announce();
}

function save_message(session_id, message) {
    request.post({url:'http://gbc.lvh.me:3000/api/v1/chat/chat_histories',
            form: { chat_history: { chat_session_id: session_id, message: message}}  },
        function(err,httpResponse,body){
            if (err) {
                console.error('save failed:', err);
            }else {
                console.log('history saved');
            }
        }
    )
}

function session_to_close(id, role){
    var arrayLength = chat_sessions.length;
    for (var i = 0; i < arrayLength; i++) {
        if (role == 'supervisor' || role == 'operator'){
            if (chat_sessions[i]['supervisor_id'] == id) {
                 return chat_sessions[i].id
            }
        }else {
            if (sessions[i]['user_id'] == id) {
                return chat_sessions[i].id
            }
        }
    }
}

function update_current_session(chat_session_id, supervisor_id) {

    // all other sessions for this supervisor should be set to false
    var arrayLength = chat_sessions.length;
    for (var i = 0; i < arrayLength; i++) {
        if (chat_sessions[i]['supervisor_id'] == supervisor_id){
            if(chat_sessions[i]['id'] == chat_session_id){
                chat_sessions[i]['current'] = true;
            }else {
                chat_sessions[i]['current'] = false;
            }
        }
    }
}
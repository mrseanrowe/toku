function add_user_details(arry, users, sessions) {
    
    //adds user that an admin is currently in chat with to returned connections
    var arrayLength = arry.length;
    for (var i = 0; i < arrayLength; i++) {
        if (arry[i]['in_session']) {
            arry[i]['user_detail'] = {
                supervisor: select_user(users, arry[i].id),
                user:  get_user(users, sessions, arry[i].id)
            } ;// find users they are talking to through chat sessions
        }
    }
    return arry;

}

function get_socket(connections, id){
    
    // what about multiple chats
    //set current session
    var arrayLength = connections.length;
    for (var i = 0; i < arrayLength; i++) {
        if(connections[i]['id'] == id){
            return connections[i]['socket'];
        }
    }
}

function select_user(users, id){
    var arrayLength = users.length;
    for (var i = 0; i < arrayLength; i++) {
        if(users[i]['id'] == id){
            return users[i];
        }
    }
}

function get_user(users, sessions, id){
    var arrayLength = sessions.length;
    for (var i = 0; i < arrayLength; i++) {
        if(sessions[i]['supervisor_id'] == id && sessions[i]['current']){
            var user_id = sessions[i]['user_id'];
            select_user(users, user_id)
        }
    }
}

function update_connections(connections, connections_to_client){
    var arrayLength = connections.length;
    for (var i = 0; i < arrayLength; i++) {
        connections[i]['in_session'] = true;
        connections_to_client[i]['in_session'] = true;
    }
}

function waiting(connections) {
    return connections.filter(is_waiting)
}

function supervisor(connections) {
    return connections.filter(is_supervisor)
}

function is_supervisor(obj) {
    return obj.role == 'supervisor' || object.role == 'operator'
}

function is_waiting(obj) {
    return obj.role == 'supervisor' && !obj.in_session;
}

module.exports.update_connections     = update_connections;
module.exports.add_user_details       = add_user_details;
module.exports.waiting                = waiting;
module.exports.supervisor             = supervisor;
module.exports.get_socket             = get_socket;
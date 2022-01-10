const connections = {} as any;

export function setConnection(connection, name = 'default') {
  connections[name] = connection;
}
export function getConnection(name: string) {
  return connections[name];
}
export function getNameByConnection(connection) {
  return Object.entries(connections).find(([key, value]) => value == connection)[0];
}

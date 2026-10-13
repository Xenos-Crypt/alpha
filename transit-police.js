import * as THREE from 'three';
export function transitArrestTarget(transit){const service=transit?.rider;if(!service||!transit.services.includes(service))return null;const x=service.stops[service.index];return {service,doors:service.doors,position:new THREE.Vector3(x,0,service.z+(service.name==='Train'?9:-7))};}

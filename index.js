const registerWorker = ({url, onmessage}) => {
    if (window.Worker) {
        const myWorker = new Worker(url || './worker.js');
        myWorker.onmessage = onmessage || function(e) {
            console.log('Message received from worker', e.data);
        }
        return myWorker
    } 
    console.error('Your browser doesn\'t support web workers.');
}

const APP = {svg:{}},
createPath = str => {
    // console.log(str)
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "path")
    APP.svg.element.appendChild(svg)
    svg.outerHTML = str
},
svgWorker = registerWorker({onmessage:e=>createPath(e.data)});

// http://localhost:5500/?sx=14.05&sy=15.55&wave0=9.8&wave1=-10&issin=true&worker=true
const searchParams = new URLSearchParams(location.search);
    let svgUrlParams = {
        step: {
            x: searchParams.has('sx') ? +searchParams.get('sx') : 3,
            y: searchParams.has('sy') ? +searchParams.get('sy') : 5
        }, 
        noise: [
            searchParams.has('wave0') ? +searchParams.get('wave0') : 1,
            searchParams.has('wave1') ? +searchParams.get('wave1') : 3,
        ], 
        logo: searchParams.has('logo') ? ('true'===searchParams.get('logo')) : true, 
        isSin: searchParams.has('issin') ? ('true'===searchParams.get('issin')) : true, 
        useWorker: searchParams.has('worker') ? ('true'===searchParams.get('worker')) : false,
    }
    console.log(!!searchParams.get('logo'),searchParams.get('logo'))


const updateSearchParams = obj => {
    const params = new URLSearchParams(location.search);
    params.set('sx', obj?.step.x);
    params.set('sy', obj?.step.y);
    params.set('wave0', obj?.noise[0]);
    params.set('wave1', obj?.noise[1]);
    params.set('logo', obj?.logo);
    params.set('issin', obj?.isSin);
    params.set('worker', obj?.useWorker);

    window.history.replaceState({}, '', `${location.pathname}?${params}`);
}
    

const input = e => {
    console.log(e)
    switch (e?.id) {
        case 'id0':
            document.querySelector('svg #tag-logo').classList.toggle('hide')
            break;
        case 'id1':
        case 'id2':
        case 'id3':
        case 'id4':
        case 'id5':
            let step = {
                x:+document.querySelector('#id1').value,
                y:+document.querySelector('#id2').value,
            },
            noise = [
                +document.querySelector('#id3').value,
                +document.querySelector('#id4').value,
            ],
            isSin = document.querySelector('#id5').checked,
            logo = document.querySelector('#id0').checked;
            let all = document.querySelectorAll('input')

            all.forEach(inp => inp.disabled = true)
            scanAll(step, noise, isSin)
            all.forEach(inp => inp.disabled = false)
            updateSearchParams({step,noise,isSin,useWorker:true,logo})
            break;
        case 'zoom': 
            document.body.style = `--zoom:${e.value};`
    
        default:
            break;
    }
}






// document.addEventListener('pointermove',e=>{
//     // console.log(isCircleOrLogo(e.offsetX,e.offsetY),e.offsetX,e.offsetY,e.screenX,e.screenY)
//     console.log(isCircleOrLogo(e.clientX,e.clientY),e.clientX,e.clientY,e.screenX,e.screenY)
//     // console.log(e)
//     // console.dir(document.elementFromPoint(e.offsetX,e.offsetY))

// })


function scanAll(step={x:3,y:5}, noise = [1,3], isSin = true, svgSize = APP.svg.element.viewBox.baseVal, useWorker=true) {
    let svg = document.querySelectorAll('svg > path')
    svg.forEach(p=>p?.remove())

    const lines = []
    console.log(arguments)
    
    for (let y = 0; y < svgSize.height; y+=step.y) {
        let line = scanLine(y, svgSize.width, step.x, noise, isSin)
        if (!line.length) continue
        lines.push(line)
    }   
    
    // eightPoint();
     
    svg = document.createElementNS("http://www.w3.org/2000/svg", "path")
    // console.log(svg)
    APP.svg.element.appendChild(svg)

    if (useWorker) return svgWorker.postMessage(lines);
    
    createPath( lines.reduce((parent,line)=>parent+svgPath(line, bezierCommand),'') )
    
    // svg.outerHTML = svgPath(genLine, bezierCommand)
    // svg.outerHTML = lines.reduce((parent,line)=>parent+svgPath(line, bezierCommand))
}


function scanLine(y, len = 100, step = 10, noise = [1,3], isSin = false, deg=0) {
    const points = []
    const counts = len/step
    for (let i=0; i<=counts; i++) {
        let x = i*step
        let el = isCircleOrLogo(...svg2html(x,y, APP.svg.box))
        if (!el) continue
        let isLogo = el == 'vector' ? 1 : 0;
        // if (!isLogo) continue
        // points.push([x,y + isLogo*2])
        points.push([x,y + noise[isLogo]*(isSin?(-1+(i%2)*2):1)])
    }
    return points
}

APP.svg.vector = document.querySelector('svg #vector')
APP.svg.circle = document.querySelector('svg #circle')

const svg2html = (x, y, offset={x:0,y:0}) => [x,y]
// [Math.round(x+offset.x), Math.round(y+offset.y)]
const checkSvgEl = (el, ids) => ids.find(id=>el?.id == id) 
// const isCircleOrLogo = (x,y) => checkSvgEl(document.elementFromPoint(x,y),['circle','vector'])
let createPoint = ((x,y,svg=APP.svg.element) => {
    let point = svg.createSVGPoint()
    return function (x, y) {
        point.x = x
        point.y = y
        // let point = new DOMPoint(x, y);
        // console.log(point)
        return point    
    }
})
const isCircleOrLogo = (x,y) => (p => 
    APP.svg.vector.isPointInFill(p) 
        ? 'vector'
        : APP.svg.circle.isPointInFill(p) 
            ? 'circle'
            : undefined)(createPoint(x, y))








// window.onload = 
svgOnload = function()
{
    APP.svg.element = document.getElementById("svg") || document.body.appendChild(document.createElement('svg'));
    createPoint = createPoint()//init
    APP.svg.box = APP.svg.element.getBoundingClientRect()
    // console.log(APP.svg.box, document.body.parentElement.scrollLeft,document.body.parentElement.scrollTop)
    // gridLines();

    // threePoint();
    // fourPoint();
    // sixPoint();
    // return
    // eightPoint();

    console.dir(APP.svg.element.querySelector('#vector'))
    // console.log(document.elementFromPoint(300, 100))
    console.log(isCircleOrLogo(300, 100))

    // svgWorker.postMessage(APP.svg.element)
    
    // let genLine = scanLine(450, APP.svg.box.width, 3)
    // console.log(genLine)
/* 
    const lines = []

    for (let y = 0; y < APP.svg.box.height; y+=5) {
        let line = scanLine(y, APP.svg.box.width, 3)
        if (!line.length) continue
        lines.push(line)
    }

    // console.log(lines)
    
    
    eightPoint();
    const svg = document.querySelector('svg > path') 

    // console.log(svg)

    
    
    svg.outerHTML = lines.reduce((parent,line)=>parent+svgPath(line, bezierCommand)) */

    // svg.outerHTML = svgPath(genLine, bezierCommand)
    // drawPoints(genLine, "#0000FF");
    // scanAll({x:3,y:5}, [1,3], true, APP.svg.element.viewBox.baseVal, false)
    scanAll(
        svgUrlParams.step, 
        svgUrlParams.noise, 
        svgUrlParams.isSin, APP.svg.element.viewBox.baseVal, 
        svgUrlParams.useWorker
    )
    console.log({svgUrlParams})
    console.log(svgUrlParams.logo)
    if (!svgUrlParams.logo) document.querySelector('svg #tag-logo').classList.toggle('hide')


    // svgUrlParams
}












function gridLines()
{
    const width = 800;
    const height = 600;
    const spacing = 100;

    for(let x = 0; x <= width; x += spacing)
    {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

        line.setAttributeNS(null, "x1", x);
        line.setAttributeNS(null, "y1", 0);
        line.setAttributeNS(null, "x2", x);
        line.setAttributeNS(null, "y2", 600);

        line.setAttributeNS(null, "stroke", "#D0D0D0");

        APP.svg.element.appendChild(line);
    }

    for(let y = 0; y <= height; y += spacing)
    {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

        line.setAttributeNS(null, "x1", 0);
        line.setAttributeNS(null, "y1", y);
        line.setAttributeNS(null, "x2", 800);
        line.setAttributeNS(null, "y2", y);

        line.setAttributeNS(null, "stroke", "#D0D0D0");

        APP.svg.element.appendChild(line);
    }
}


function drawPoints(points, colour)
{
    for(const point of points)
    {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");

        circle.setAttributeNS(null, "cx", point[0]);
        circle.setAttributeNS(null, "cy", point[1]);
        circle.setAttributeNS(null, "r", 2);

        circle.setAttributeNS(null, "fill", colour);

        APP.svg.element.appendChild(circle);
    }
}


function generatePath(points, relative)
{
    let type = null;

    if(points.length === 3)
    {
        type = "Q";
    }
    else if(points.length === 4)
    {
        type = "C";
    }
    else if(points.length % 2 === 0)
    {
        type = "C";
    }
    else
    {
        throw 'Number of points must be 3 or an even number more than 3';
    }

    const pathPoints = ["M ", points[0][0], ",", points[0][1], type];

    for(let p = 1, l = points.length; p < l; p++)
    {
        if(p >= 4 && p % 2 === 0)
            pathPoints.push("S");

        pathPoints.push(points[p][0]);
        pathPoints.push(",");
        pathPoints.push(points[p][1]);
    }

    return pathPoints.join(" ");
}


function drawBezier(pathString, stroke)
{
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttributeNS(null, "d", pathString);
    path.setAttributeNS(null, "stroke", stroke);
    path.setAttributeNS(null, "fill", "transparent");
    path.setAttributeNS(null, "stroke-width", "1px");
    document.querySelector("svg").appendChild(path);
}


function threePoint()
{
    const points = [[50,50],[150,550],[750,50]];

    drawPoints(points, "#FF0000");

    const pathString = generatePath(points, false);

    drawBezier(pathString, "#FF0000");
}


function fourPoint()
{
    const points = [[50,50],[50,550],[750,550],[750,150]];

    drawPoints(points, "#00C000");

    const pathString = generatePath(points, false);

    drawBezier(pathString, "#00C000");
}


function sixPoint()
{
    const points = [[50,50],[150,500],[500,400],[400,200],[650,150],[750,50]];

    drawPoints(points, "#0000FF");

    const pathString = generatePath(points, false);

    drawBezier(pathString, "#0000FF");
}


function eightPoint()
{
    const points = [[50,50],[50,350],[250,200],[400,300],[200,450],[500,500],[650,200],[750,550]];
//               M  50, 50 C 50, 350  250, 200 400, 300 S 200, 450  500, 500 S 650, 200 750, 550
    // drawPoints(points, "#FF8000");

    const pathString = generatePath(points, false);

    drawBezier(pathString, "#FF8000");
}


// The smoothing ratio
const smoothing = 0.2

const points = [
  [5, 10],
  [10, 40],
  [40, 30],
  [60, 5],
  [90, 45],
  [120, 10],
  [150, 45],
  [390, 25],
  [210, 90],
  [150, 160],
  [300, 10]
]

// Properties of a line 
// I:  - pointA (array) [x,y]: coordinates
//     - pointB (array) [x,y]: coordinates
// O:  - (object) { length: l, angle: a }: properties of the line
const line = (pointA, pointB) => {
  const lengthX = pointB[0] - pointA[0]
  const lengthY = pointB[1] - pointA[1]
  return {
    length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
    angle: Math.atan2(lengthY, lengthX)
  }
}

// Position of a control point 
// I:  - current (array) [x, y]: current point coordinates
//     - previous (array) [x, y]: previous point coordinates
//     - next (array) [x, y]: next point coordinates
//     - reverse (boolean, optional): sets the direction
// O:  - (array) [x,y]: a tuple of coordinates
const controlPoint = (current, previous, next, reverse) => {

  // When 'current' is the first or last point of the array
  // 'previous' or 'next' don't exist.
  // Replace with 'current'
  const p = previous || current
  const n = next || current

  // Properties of the opposed-line
  const o = line(p, n)

  // If is end-control-point, add PI to the angle to go backward
  const angle = o.angle + (reverse ? Math.PI : 0)
  const length = o.length * smoothing

  // The control point position is relative to the current point
  const x = current[0] + Math.cos(angle) * length
  const y = current[1] + Math.sin(angle) * length
  return [x, y]
}

// Create the bezier curve command 
// I:  - point (array) [x,y]: current point coordinates
//     - i (integer): index of 'point' in the array 'a'
//     - a (array): complete array of points coordinates
// O:  - (string) 'C x2,y2 x1,y1 x,y': SVG cubic bezier C command
const bezierCommand = (point, i, a) => {

  // start control point
  const cps = controlPoint(a[i - 1], a[i - 2], point)

  // end control point
  const cpe = controlPoint(point, a[i - 1], a[i + 1], true)
  return `C ${cps[0]},${cps[1]} ${cpe[0]},${cpe[1]} ${point[0]},${point[1]}`
}

// Render the svg <path> element 
// I:  - points (array): points coordinates
//     - command (function)
//       I:  - point (array) [x,y]: current point coordinates
//           - i (integer): index of 'point' in the array 'a'
//           - a (array): complete array of points coordinates
//       O:  - (string) a svg path command
// O:  - (string): a Svg <path> element
const svgPath = (points, command) => {
  // build the d attributes by looping over the points
  const d = points.reduce((acc, point, i, a) => i === 0
    ? `M ${point[0]},${point[1]}`
    : `${acc} ${command(point, i, a)}`
  , '')
  return `<path d="${d}" fill="none" stroke="grey" />`
}

// const svg = document.querySelector('svg path')

// svg.innerHTML = svgPath(points, bezierCommand)
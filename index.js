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

const isBool = v => (v === false || v === true);

var bitmap = Array(), lastBitMapLen=0;

try {
    let lsbitmap = JSON.parse(localStorage?.bitmap)
    if (lsbitmap.length) bitmap = lsbitmap
    lastBitMapLen = lsbitmap.length
} catch (e) { console.warn(e) }

// console.log({bitmap})

const APP = {svg:{}},
createPath = str => {

    console.time('addSVG')
    APP.svg.path.innerHTML = str
    console.timeEnd('addSVG')

    if (bitmap.length <= lastBitMapLen) return

    console.time('JSON')
    lastBitMapLen = bitmap.length
    localStorage.bitmap = JSON.stringify(bitmap)
    console.timeEnd('JSON')
},
svgWorker = registerWorker({onmessage:e=>createPath(e.data)});

const defaults = {    
    step: {
        x: 13,
        y: 15
    }, 
    // deg: 0,
    noise: [
        1,
        3,
    ],
    stroke: 1,
    faseK: 0,
    logo: true, 
    logobg: true,
    isSin: true, 
    random: {
        algo: 0,
        seed: 'TAG-2022',
        to: 0,
    },
    bezier:{
        smoothing:.2,
    },
    color: {
        lines: "#808080",
        bg: "#1D1E26",
        tshirt: "#303152",
        sleeves: "#232323",
        stitches: "#1A81E8",
        label: "#E35453",
    },
    // dx:10,
    // useWorker: false,
}
// Object.freeze(defaults);
const deepFreeze = obj => {
    Object.freeze(obj);
    for(let key in obj) {
        if(obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
            Object.freeze(obj[key]);
        }
    }
}

let settings = JSON.parse(JSON.stringify(defaults))
// {...defaults,logo:false}
deepFreeze(defaults)


const iterSettings = (obj, func=(id,key,val,obj)=>{}, pkey='') => {
    const mkId = key => pkey ? pkey +'-'+ key : key;
    for (const key in obj) {
        const val = obj[key]
        if (val instanceof Array || val instanceof Object) {
            iterSettings(val, func, key)
            continue
        }
        func(mkId(key), key, val, obj)
    }
}

const writeWithId = (id, obj, val) => {
    // console.trace('writeWithId')
    const path = id.split('-')
    // console.log('wrrr', {id,val,obj},path,obj.logo)
    if (!path.length) return obj

    const look = (ref=obj, key=path.shift()) => {
        // console.log('wrrr', {ref,key},path)
        if (!(key in ref)) return obj

        if (path.length) return look(ref[key]) 
        // console.log(key,ref[key],!isNaN(ref[key]), ref[key] === false || ref[key] === true, ref[key].constructor, typeof ref[key])
        if (!isNaN(ref[key])) val = (isBool(ref[key]) )
            ? (val == 'true' || val == true)
            : +val
        // console.log({old:ref[key],val})
        ref[key] = val
        return obj
    }

    // const res = look()
    // return res
    return look()
}

const readWithId = (id, obj) => {
    const path = id.split('-')
    if (!path.length) return null

    const look = (ref=obj, key=path.shift()) => {
        if (path.length) return look(ref[key]) 
        return ref[key]
    }

    return look()
}

const createInput = (id, val, fn=_=>{} ) => {
    let div = document.createElement('div')    
    switch (val.constructor) {
        case Number:  
            div.oninput = e=>{
                fn(+e.target?.value)   
                e.target.previousElementSibling.lastChild.value = e.target?.value
                input(e.target)
            }       
            div.innerHTML = `
                <label for="${id}">${id.split('-').join(' ')}: <output>${val}</output></label>
                <input type="range" min="-10" max="10" value="${val}" step=".1" id="${id}">`
            break;
        case Boolean:       
            div.oninput = e=>{
                fn(e.target?.checked)    
                input(e.target)
            }   
            div.innerHTML = `
                <label for="${id}">${id.split('-').join(' ')}:</label>
                <input type="checkbox" id="${id}" ${val ? 'checked' : ''}>`
            break;        
        case String:  
            div.oninput = e=>{
                fn(e.target?.value)   
                input(e.target)
            }   
            div.innerHTML = `
                <label for="${id}">${id.split('-').join(' ')}:</label>
                <input type="text" id="${id}" value="${val}">`
            break;
    
        default:
            console.warn("Can't create element of type:",val.constructor, {id,val,fn} )
            break;
    }
    return div
}

const readFromUrl = (obj=defaults) => {    
    const params = new URLSearchParams(location.search);

    for (let p of params) {
        console.log({p});
        writeWithId(p[0],settings,p[1])
    }
    document.querySelector('svg a').setAttribute('href','https://tag.morozov.page/mklogo/'+window.location.search)

    return settings
}
const writeToUrl = (obj=settings, def=defaults, skey='p') => {    
    const s = {}
    iterSettings(obj,(id,key,val,obj)=>{
        const defVal = readWithId(id, def)
        if (defVal != undefined && val != defVal) s[id] = val
    })
    const p = new URLSearchParams(s);
    window.history.pushState({}, '', `${location.pathname}?${p}`);

    document.querySelector('svg a').setAttribute('href','https://tag.morozov.page/mklogo/'+window.location.search)

    return s
}

// console.log('write',writeToUrl())
// console.log('read',readFromUrl())
settings = readFromUrl()


const readFromInput = (id, val, obj=settings) => {
    obj = writeWithId(id, arg, val)
}
const readFromInputElement = (el, obj=settings) => {
    console.log('readFromInputElement',{el,type:el.type})
    let val, id = el.id;
    if (el.type == 'checkbox') val = el.checked
    else if (el.type == 'range') val = +el.value
    else if (el.type == 'color') val = el.value
    else if (el.type == 'text') val = el.value+''
    else if (el.type == 'select-one') val = +el.value
    else return obj

    obj = writeWithId(id, obj, val)

    return obj
}
const readFromInputElements = (doc=document,obj=settings) => 
    doc.querySelectorAll('input, select').forEach(el=>readFromInputElement(el,obj))

    
const writeToInputs = (arg=settings,fn=_=>{}) => {
    console.log("s.logo",settings.logo)
    // const inputs = document.querySelectorAll('.controll input')
    const inputs = document.querySelector('.controll')
    const getInput = id => inputs.querySelector(`#${id}`)
    const allIds = []
    // console.log(mkId(key),getInput(mkId(key)),{obj,pkey,val})
    // const id = mkId(key)
    iterSettings(arg,(id,key,val,obj)=>{
        const inp = getInput(id) 
        allIds.push(id)
        if (!inp) {
            console.warn('no input with id:', id, 'creating input with js...')
            let div = createInput(id, val, e=>{obj[key]=e,fn()} )
            inputs.appendChild(div)
            input(id, false)
            console.log('add this input to html, pls\n\n\n', div.outerHTML)
            return
        }
        console.log('test',{val}, val instanceof Boolean)
        if (val instanceof Boolean || isBool(val)) {
            inp.checked = val
            input(inp, false)

            return
        }
        if (!('value' in inp)) {
            console.warn('no "value" in input:', inp)
            input(inp, false)
            return
        }
        inp.value = val
        input(inp, false)

    })
    // iter(arg)
    console.log({allIds}, {...settings})
    return arg
}
// writeToInputs(settings)


const updateLogo = (s=settings) => {
    if (s.logo) document.querySelector('svg #tag-logo').style = ''
    else document.querySelector('svg #tag-logo').style = 'display: none;'
}
const updateLogoBg = (s=settings) => {
    if (s.logobg) document.querySelector('svg #tag-logo #circle').style = ''
    else document.querySelector('svg #tag-logo #circle').style = 'opacity: 0;'
}
const updateInputOutput = (e, value=e.value) =>{ 
    if (e.previousElementSibling?.lastChild && 'value' in e.previousElementSibling.lastChild)
    e.previousElementSibling.lastChild.value = value
};

const applyStroke = (element,params={width:1,color:'grey'}, units = 'mm') => {
    if (!element) return
    console.dir(element)
    // element.style = `stroke: ${color}; stroke-width: ${width+units};`

    params?.width && element.setAttribute('stroke-width', params.width + units)
    params?.color && element.setAttribute('stroke', params.color)
    params?.color && element.setAttribute('color', params.color)
}

const input = (e,isEvent=true) => {
    if (!e) return
    console.log({e})

    const id = e?.id || e
    if (typeof e === 'string') e = document.querySelector(`input#`+e)
    console.log({e})
    

    switch (id) {
        case 'logo':
            // document.querySelector('svg #tag-logo').classList.toggle('hide')
            updateLogo(readFromInputElement(e))
            if (!isEvent) break
            writeToUrl(readFromInputElements(document.querySelector('.controll'),settings))
            break;
        case 'logobg':
            // document.querySelector('svg #tag-logo').classList.toggle('hide')
            updateLogoBg(readFromInputElement(e))
            if (!isEvent) break
            writeToUrl(readFromInputElements(document.querySelector('.controll'),settings))
            break;
        case 'step-x':
        case 'step-y':
        case 'noise-0':
        case 'noise-1':
        case 'isSin':
        case 'faseK':
            updateInputOutput(e)
            if (!isEvent) break
            const obj = readFromInputElement(e)
            settings = obj

            console.log(obj)
            writeToUrl(settings)
            scanAll(obj)

            // all.forEach(inp => inp.disabled = true)
            // scanAll(step, noise, isSin)
            // all.forEach(inp => inp.disabled = false)
            // updateSearchParams({step,noise,isSin,useWorker:true,logo})
            break;
        case 'zoom': 
            document.body.style = `--zoom:${e.value};`
            updateInputOutput(e, e.value*100+'%')
            
            break;
        case 'stroke':
            updateInputOutput(e)
            applyStroke(APP.svg.path, {width: e.value})
            break;
        case 'color-lines':
            applyStroke(APP.svg.path, {color: e.value})
            break;
        case 'color-bg':
            document.querySelector('html').style = `--color-bg: ${e.value};`
            break;
        case "color-tshirt":
        case "color-sleeves":
        case "color-stitches":
        case "color-label":
            mockup.setColor(e)
            if (!isEvent) break
            readFromInputElement(e,settings)
            writeToUrl(settings)
        break;
        case 'bezier-smoothing':
            updateInputOutput(e)
            svgWorker.postMessage(+e.value)
        default:
            
            if (!isEvent) break
            scanAll(readFromInputElements(document.querySelector('.controll'),settings))
            writeToUrl(settings)
            break;
    }
    
}

function xmur3(str) {
    str=str.toString() ?? str
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
        h = h << 13 | h >>> 19;
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}
function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function xoshiro128ss(a, b, c, d) {
    return function() {
        var t = b << 9, r = a * 5; r = (r << 7 | r >>> 25) * 9;
        c ^= a; d ^= b;
        b ^= c; a ^= d; c ^= t;
        d = d << 11 | d >>> 21;
        return (r >>> 0) / 4294967296;
    }
}

function jsf32(a, b, c, d) {
    return function() {
        a |= 0; b |= 0; c |= 0; d |= 0;
        var t = a - (b << 27 | b >>> 5) | 0;
        a = b ^ (c << 17 | c >>> 15);
        b = c + d | 0;
        c = d + t | 0;
        d = a + t | 0;
        return (d >>> 0) / 4294967296;
    }
}


function random(seed = 1) {
    // var seed = 1;

    return _ => {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }
}

// Create xmur3 state:
var seed = xmur3("TAG-2022");
// Output four 32-bit hashes to provide the seed for sfc32.
var rand = sfc32(seed(), seed(), seed(), seed());

// Output one 32-bit hash to provide the seed for mulberry32.
// var rand = mulberry32(seed());



function scanAll(S=settings, svgSize = APP.svg.element.viewBox.baseVal, useWorker=true) {
    console.time('scanAll')
        
    const {width, height} = svgSize
    const xstep = S.step.x
    const ystep = Math.round(S.step.y)
    const dx = (S?.dx || S?.dx === 0) ? Math.round(S.dx) : Math.round(xstep/4)
    const dx2 = 2*dx
    const {noise, isSin, deg, faseK} = S
    const dnoise = (Math.abs(noise[1]) - Math.abs(noise[0]) )
    // const dnoise = Math.abs(Math.abs(noise[1]) - Math.abs(noise[0]) )
    const nInc =  dnoise / (dx2)
    const PI = Math.PI

    const isRand = S?.random?.algo || false;
    seed = xmur3(S?.random?.seed || "TAG-2022");

    rand = isRand && S?.random?.algo 
            ? S.random.algo == 1
            ? sfc32(seed(), seed(), seed(), seed())
            : S.random.algo == 2
            ? jsf32(seed(), seed(), seed(), seed()) 
            : S.random.algo == 3
            ? xoshiro128ss(seed(), seed(), seed(), seed())
            : mulberry32(seed())
        : _=>1;

    // TODO: it's horibble
    const sin = !isSin 
        ? !isRand
            ? _=>1
            : S?.random?.to 
            ? (S.random.to == 1)
                ? (x,y) => rand()*rand()
                : (S.random.to == 2)
                ? (x,y) => rand()*2
                : (S.random.to == 3)
                ? (x,y) => rand()+rand()
                : (x,y) => x%(xstep/2+faseK)*rand()/2 
            : (x,y) => rand() 
        : !isRand
        ? (x,y) => Math.sin(faseK*y+2*PI*x/xstep) 
        : S?.random?.to 
        ? (S.random.to == 1)
            ? (x,y) => Math.sin(faseK*y+2*PI*x/xstep*rand()) 
            : (S.random.to == 2)
            ? (x,y) => Math.sin(faseK*y*rand()+2*PI*x/xstep) 
            : (S.random.to == 3)
            ? (x,y) => Math.sin(faseK*y+2*PI*x/xstep)/(rand()+.5) 
            : (x,y) => Math.sin(faseK*y+2*PI*x/xstep*rand()*10) 
        : (x,y) => Math.sin(faseK*y+2*PI*x/xstep+rand()) 
    
    const lines = Array(svgSize.height)
    const blinelen = Math.floor(width+dx)
    
    function scanLine(y) {
        const points = []
        const bitmapline = Array(blinelen)
        let isLogoOld = -2;
        let isLogo = -2;
        let x1 = -1;
        let oldN = -1;
        let tr = 0;
        let ddx = -1;

        for (let x=0; x<=width; x++) {
            isLogo = isCircleOrLogo(x+dx,y)
            bitmapline[x+dx] = isLogo

            if (isLogo != isLogoOld && isLogoOld >=-1) {
                x1 = x + dx2
                oldN = noise[isLogo] || oldN
                tr = ((isLogoOld < 0) ? 1 : (isLogo < 0) ? 3 : 2)
            }

            isLogoOld = isLogo
            if (x < x1) {
                ddx = x1 - x
                if (isLogoOld >= 0 && tr == 2) {
                    points.push([x,y + sin(x,y)*(oldN - nInc*ddx*(isLogoOld*2-1))])
                } else {
                    if ((ddx <= dx && tr == 1) || (ddx > dx && tr == 3))  {
                        // drawPoints([[x,y]], "#FF8000");
                        points.push([x,y + sin(x,y)*oldN])
                    }
                }
                continue
            }
            x1 = -1
    
            if (isLogo < 0) continue

            points.push([x,y + sin(x,y)*noise[isLogo]])
        }
        // drawPoints(points, "#FF8000");
        bitmap[y] = bitmapline;
        return points
    }
    for (let y = 0; y < height; y+=ystep) {
        let line = scanLine(y)
        if (!line.length) continue
        lines[y] = line
    }   
    console.timeEnd('scanAll')
    

    if (useWorker) return svgWorker.postMessage(lines);
    
    createPath( lines.reduce((parent,line)=>parent+svgPath(line, bezierCommand),'') )
}





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
    (bitmap[y]) 
    ? bitmap[y][x] ?? -2
    : APP.svg.vector.isPointInFill(p) 
    ? 1
    : APP.svg.circle.isPointInFill(p) 
    ? 0
    : -1
)(createPoint(x, y))








window.onload = function()
// svgOnload = function()
{
    APP.svg.element = document.getElementById("svg") || document.body.appendChild(document.createElement('svg'));

    APP.svg.box = APP.svg.element.getBoundingClientRect()

    APP.svg.path = document.createElementNS("http://www.w3.org/2000/svg","g")
    APP.svg.path.setAttribute('id','generated-path')
    APP.svg.element.appendChild(APP.svg.path)
    
    APP.svg.vector = document.querySelector('svg #vector')
    APP.svg.circle = document.querySelector('svg #circle')
    createPoint = createPoint()//init
    

    writeToInputs(settings,input)
    updateLogo(settings)
    
    scanAll()

    APP.svg.element.style = ''

    mockup.fetch(document.querySelector('#mockup'))
    
}


const mockup = {
    element: {},
    part: {
        label: {},
        tshirt: {},
        sleeves: {},
        stitches: {},
    },
    fetch: el => fetch('t-shirt-mockup.svg')
                .then(r => r.text())
                .then(text => {
                    el.innerHTML = text;
                    return el
                })
                .then(mockup.init)
                .catch(console.error.bind(console)),
    init: el => {
        mockup.element = el
        for (const key in mockup.part) {
            mockup.part[key] = el.querySelector(`#colors #`+key)
            mockup.setColor(document.querySelector('input#color-'+key))
        }
    },
    setColor: el => {
        console.trace('setColor', {el})
        if (!el) return
        const id = el.id.slice(6)
        const target = mockup.part[id] ?? ""
        if (!target) throw 'no target in setColor'
        if (target.constructor == Object) return
        console.log({target})
        target.setAttribute('color', el.value)
    }

}

function svgLoaded(){
    console.log(arguments)
    let svgObj = document.querySelector("#svg-object")
        board = document.querySelector(".illustration")
        // board = document.querySelector(".illustration > div")
        svg = svgObj.contentDocument.childNodes[0]
        svgObj.remove();
        board.prepend(svg)
        svg.setAttribute("width", "100%")
        svg.setAttribute("height", "100%")
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
        circle.setAttributeNS(null, "r", 1);

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
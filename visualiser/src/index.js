document.addEventListener("DOMContentLoaded", async () => {
    await import("https://d3js.org/d3.v7.min.js");
    /**
     * @type {import('d3').Simulation}
     */
    let peopleFilter = undefined;
    let forcesEnabled = true;
    let twoWayOnly = false;
    let showConn = false;
    
    let charge = -30;
    let numLinks = 3;
    let drag = 0.4;
    const svg = d3.select('svg');
    const width = innerWidth,
    height = innerHeight;
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    let {simulation, cleanup} = runSim(transform(rawData, 3));

    document.querySelector("input[name=show-conn]").addEventListener("input", ({target})=>showConn = target.checked);

    // CONTROL PANE:
    document.querySelector("input[name=two-way-conn]").addEventListener("input", ({target})=>{
        twoWayOnly = target.checked;
        updateGraph();
    });
    
    document.querySelector("input[name=charge]").addEventListener("input", ({target})=>{
        simulation.force('charge').strength(+(document.querySelector("span.charge-value").innerHTML = charge = +target.value));
        restart();
    });

    document.querySelector("input[name=drag]").addEventListener("input", ({target})=>{
        simulation.velocityDecay(+(document.querySelector("span.drag-value").innerHTML = drag = +target.value));
        restart();
    });
    document.querySelector("input[name=reheat]").addEventListener("click", ()=>restart());

    document.querySelector("input[name=disable-temp]").addEventListener("input", ({target})=>{
        if(target.checked) simulation.alpha(1);
        simulation.alphaDecay(target.checked?0: (1 - 0.001** (1 / 300)));
    });

    document.querySelector("input[name=connections]").addEventListener("input", ({target}) => {
        numLinks = parseInt(target.value);
        document.querySelector("span.connections-count").innerHTML = numLinks;
        updateGraph();
    });
    document.querySelector("input[name=export]").addEventListener("click", ()=>{
        const downloadLink = document.createElement("a");
        downloadLink.download = `Graph_${new Date().toISOString()}.svg`;
        downloadLink.href = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent('<?xml version="1.0" standalone="no"?>\r\n'+(new XMLSerializer().serializeToString(document.querySelector("svg"))).replace(/\<svg (.*) width=.*\>/, "<svg $1>"));
        downloadLink.click();
    });

    document.querySelector('input[name=selective-reset]')?.addEventListener('click', ()=>{
        peopleFilter = undefined;
        document.querySelector('input[name=selective]').type = "text";
        document.querySelector('input[name=selective]').type = "file";
        updateGraph();
    });

    document.querySelector('input[name=selective]')?.addEventListener('change', ({target})=> applyFilter(target.files[0]) );
    document.querySelector("input[name=restart]").addEventListener("click", ()=>updateGraph());

    document.querySelector('input[name=selective]').addEventListener('dragover', e=>{
        e.stopPropagation();
        e.preventDefault();
        // Style the drag-and-drop as a "copy file" operation.
        e.dataTransfer.dropEffect = 'copy';
      });

    document.querySelector('input[name=selective]').addEventListener('drop', e=>{
        e.stopPropagation();
        e.preventDefault();
        applyFilter(e.dataTransfer.files[0]);
    });
    
    // PAUSE
    document.querySelector('input[name=pause]').addEventListener("change", ({ target }) => {forcesEnabled = target.checked});


    // HELPERS
    function applyFilter(filter){
        const fr = new FileReader();
        if(filter) fr.readAsText(filter);
        return (filter?new Promise(res=>{
            fr.addEventListener('load', res)
        }):Promise.resolve({target: {}}))
        .then(e=>peopleFilter = e.target.result.replace(/\r/g, "").split(/[,\n]/g).filter(a=>a))
        .catch(()=>peopleFilter=undefined)
        .then(f=>updateGraph())
    }

    function restart(){simulation.alphaTarget(0.3).restart(); setTimeout(()=>simulation.alphaTarget(0), 5000)}

    function runSim(graph) {
        const simulation = d3.forceSimulation(graph.nodes, true)
            .force('charge', d3.forceManyBody().strength(charge))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('link', d3.forceLink().links(graph.links).distance(n=>n.value).id(d=>d.id))
            .velocityDecay(drag)
            .stop();
        svg.call(d3.zoom().on("zoom", e => d3.selectAll('svg > g').attr('transform', e.transform)))

        const link = svg.append('g')
            .attr('class', 'links')
            .selectAll('polyline')
            .data(graph.links, data=>data.source+data.target)
            .enter().append('polyline')
            .attr('stroke-width', d => d.value/graph.numLinks * 5)
            .attr('stroke', d => color(d.value))

        const node = svg.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(graph.nodes, data=>data.id)
            .enter().append('circle')
            .on("click", (_,d) => {
                if (typeof d.focused === 'number') { clearTimeout(d.focused); d.focused = true }
                else d.focused = !d.focused;
            })
            .on("mouseover", (_,d) => { if (d.focused !== true) d.focused = setTimeout(() => d.focused = false, 3000); })
            .on("mouseout", (_,d) => { if (typeof d.focused === 'number') { clearTimeout(d.focused); d.focused = false; } })
            .call(d3.drag()
                .on('start', (event, node)=>{
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    node.fx = node.x;
                    node.fy = node.y;
                })
                .on('drag', (event, node)=>{
                    node.x = event.x;
                    node.y = event.y;
                    node.fx = node.x;
                    node.fy = node.y;
                })
                .on('end', (event, node)=>{
                    if (!event.active) simulation.alphaTarget(0);
                    node.fx = null;
                    node.fy = null;
                }))
            .attr('r', 7.5)
        // dragging dots
            
        const fps = d3.select("span.fps");
        let lastTick = Date.now();
        /**
         * @param {DOMHighResTimeStamp} nowTick 
         */
        function renderer(nowTick) {
            if(forcesEnabled) simulation.tick();
            // if((++frames)%5!==0) return;
            // frames = 0;
            svg.attr('width', innerWidth)
            svg.attr('height', innerHeight)
            link
                .attr('points', ({ source, target })=>
                    (source.focused || target.focused || showConn) && shouldShowLink({source, target, numLinks: graph.numLinks}) ?
                        `${source.x},${source.y} ${(source.x + target.x) / 2},${(source.y + target.y) / 2} ${target.x},${target.y}`
                        : undefined
                );
            node
            // .attr('transform', d => `translate(${d.x}, ${d.y})`)
                .attr("cx", node=>node.x)
                .attr("cy", node=>node.y)
                .attr('fill', node => node.focused?"#ff0":node.defaultFill)
            // .attr('cx', d => d.x)
            // .attr('cy', d => d.y);
            let fps_num = 1000/(nowTick - lastTick);
            fps.html(Math.round(fps_num));
            // requestIdleCallback(()=>document.querySelector("svg > style").innerHTML = document.querySelector("svg > style").innerHTML.replace(/all (\d+\.\d*|NaN) linear/,`all ${fps_num.toString()} linear`))
            lastTick = nowTick;
            rafHandle = requestAnimationFrame(renderer);
        }
        graphStr = JSON.stringify(graph);
        requestAnimationFrame(renderer);
        return {simulation, node, link, cleanup(){
            node.remove();
            link.remove();
            // svg.clear();
            cancelAnimationFrame(rafHandle);
        }};
    }

    function shouldShowLink({target, source, numLinks}){
        return (!twoWayOnly || (twoWayOnly && rawData[target.index || target].filter(i=>i in rawData).slice(0,numLinks).includes(+(source.index || source))))
    }

    function transform(rawData, numLinks, studentList = Array.from(Object.keys(rawData))) {
        const nodes = [],
            links = [];
        for (const student of studentList) {
            if(student in rawData){
                nodes.push({ id: +student, focused: false, defaultFill: y7.includes(student)?"#e00":y8.includes(student)?"#080": y9.includes(student)?"#00e":"#666" });
                for (let i = 0, collected = 0; collected < numLinks && i < rawData[student].length; i++) {
                    if (studentList.includes(rawData[student][i]+"") && shouldShowLink({target:rawData[student][i], source:student, numLinks})) {
                        links.push({ source: +student, target: rawData[student][i], value: numLinks - collected++ })
                    }
                }
            }
        }
        return { nodes, links, numLinks }
    }
    function updateGraph(graph = transform(rawData, numLinks, peopleFilter)){
        if(graph.nodes.length === 0) alert("Warning: no nodes found");
        cleanup();
        let ret = runSim(graph);
        simulation = ret.simulation;
        cleanup = ret.cleanup;
    }
});
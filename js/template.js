function Template(context, canvas_width, canvas_height) {
	this.size_multiplier = 1;
	this.origin = {x:null, y:null};
	this.originTile = null;
	this.terminus = {x:null, y:null};
	this.originLocked = false;
	this.minHitFactor = 0.5;

	this.drawBox = function(position, tile){
		context.beginPath();
		context.rect(position.x, position.y, 150, 200);
		this.origin = {x:position.x, y:position.y};
		this.originTile = tile;
		context.fillStyle= "red";
		context.fill();
	}

	this.drawLine = function(){
		//Draw line from origin to terminus
		context.beginPath();
		context.moveTo(this.origin.x, this.origin.y);
		context.lineTo(this.terminus.x, this.terminus.y);
		context.lineWidth=2;
		context.strokeStyle = "red";
		context.stroke();
	}

	this.getConeVerts = function(){
		var delta_x = (this.terminus.x - this.origin.x);
		var delta_y = (this.terminus.y - this.origin.y);

		var vert_1 = {x:(this.terminus.x - delta_y/2), y:(this.terminus.y + delta_x/2)};
		var vert_2 = {x:(this.terminus.x + delta_y/2), y:(this.terminus.y - delta_x/2)};

		return [this.origin, vert_1, vert_2, this.terminus];
	}

	this.drawCone = function(){
		//Draw line from origin to terminus
		//add cross line running at opposite slope through terminus for same length
		var verts = this.getConeVerts();
		context.beginPath();
		context.moveTo(verts[0].x, verts[0].y);
		context.lineTo(verts[1].x, verts[1].y);
		context.lineTo(verts[2].x, verts[2].y);
		context.lineTo(verts[0].x, verts[0].y);
		context.lineWidth=2;
		context.strokeStyle = "red";
		context.stroke();
	}

	this.fillPoly = function(poly, color){
		//Draw line from origin to terminus
		//add cross line running at opposite slope through terminus for same length
		context.beginPath();
		context.moveTo(poly[0].x, poly[0].y);
		for (var i = 0; i < poly.length-1; i++) {
			context.lineTo(poly[i+1].x, poly[i+1].y);
		}
		context.lineTo(poly[0].x, poly[0].y);
		context.fillStyle = color;
		context.fill();
	}

	this.calculateHitCone = function(board){
		var verts = this.getConeVerts();
		//Get leftmost tile edge and start scan from there
		var poly = [verts[0],verts[1],verts[2]];
		poly = this.cropPoly(poly, board.origin, {x:board.origin.x+board.width, y:board.origin.y+board.height});
		this.calculateHitPoly(poly, board);
	}

	this.calculateHitPoly = function(polyVerts, board){
		var scan_x = Math.ceil((this.farthestBound(polyVerts, "min", "x") - board.origin.x)/board.tile_width)*board.tile_width+board.origin.x;
		scan_x = Math.max(scan_x, board.origin.x);
		var max_tile_edge_x = Math.ceil((this.farthestBound(polyVerts, "max", "x")-board.origin.x)/board.tile_width)*board.tile_width+board.origin.x;
		max_tile_edge_x = Math.min(max_tile_edge_x, board.origin.x+board.width);

		var that = this;
		var comp_x = function (u, v){return that.farthestBound(u, "min", "x") - that.farthestBound(v, "min", "x");}

		while(scan_x <= max_tile_edge_x){
			if(scan_x==max_tile_edge_x){this.calculateHitColumn(polyVerts, board, scan_x);break;}
			var vertical_segments = this.slicePoly(polyVerts, scan_x, true);
			vertical_segments.sort(comp_x);
			polyVerts = vertical_segments[1];
			var curr_vertical_segment = vertical_segments[0];
			if(!polyVerts){
				//No cut happened
				scan_x += board.tile_width;
				polyVerts = vertical_segments[0];
				continue;
			}
			
			this.calculateHitColumn(curr_vertical_segment, board, scan_x);
			scan_x += board.tile_width;
			if(vertical_segments.length == 1){break;}
		}
	}

	this.calculateHitColumn = function(polyVerts, board, curr_x){
		var scan_y = Math.ceil((this.farthestBound(polyVerts, "min", "y")-board.origin.y)/board.tile_height)*board.tile_height+board.origin.y;
		scan_y = Math.max(scan_y, board.origin.y);
		var max_tile_edge_y = Math.ceil((this.farthestBound(polyVerts, "max", "y")-board.origin.y)/board.tile_height)*board.tile_height+board.origin.y;
		max_tile_edge_y = Math.min(max_tile_edge_y, board.origin.y+board.height);
		
		var that = this;
		var comp_y = function (u, v){return that.farthestBound(u, "min", "y") - that.farthestBound(v, "min", "y");}
		
		while(scan_y <= max_tile_edge_y){
			if(scan_y==max_tile_edge_y){this.calculateHitTile(polyVerts, board, curr_x, scan_y);break;}
			var horizontal_segments = this.slicePoly(polyVerts, scan_y, false);
			horizontal_segments.sort(comp_y); //They are returned sorted inverse
			polyVerts = horizontal_segments[1];
			var curr_horizontal_segment = horizontal_segments[0];
			if(!polyVerts){
				//No cut happened
				scan_y += board.tile_height;
				polyVerts = horizontal_segments[0];
				continue;
			}
			this.calculateHitTile(curr_horizontal_segment, board, curr_x, scan_y);
			scan_y += board.tile_height;
			if(horizontal_segments.length == 1){break;}
		}
	}

	this.calculateHitTile = function(polyVerts, board, curr_x, curr_y){
		if(!polyVerts){return;}
		if(this.polyArea(polyVerts) > (board.tile_width*board.tile_height*this.minHitFactor)){
			board.getTileByCoord(curr_x-board.tile_width/2, curr_y-board.tile_height/2).isHit = true;
		}
	}

	this.setOrigin = function(position, tile){
		if(this.originLocked){return;}
		this.origin = {x:position.x, y:position.y};
		this.originTile = tile;
	}

	this.drawOrigin = function(){
		context.beginPath();
		context.arc(this.origin.x, this.origin.y, 10, 0, 2*Math.PI);
		context.fillStyle = "red";
		context.fill();
	}

	this.setTerminus = function(position){
		this.terminus = {x:position.x, y:position.y};
	}

	this.setVector = function(position, length){
		//set terminus based on origin, 2nd position and length
		var delta_x = (position.x - this.origin.x);
		var delta_y = (position.y - this.origin.y);
		var slope = delta_y/delta_x;
		if(delta_y == 0){slope=0;} // If straight horizontal, slope is 0
		if(delta_x == 0){this.terminus = {x:this.origin.x, y:this.origin.y+(length*Math.sign(delta_y))};return;} //If straight vertical, run length vertical
		var slope_length = Math.sqrt(1+(slope*slope));
		var multiplier = length / slope_length;
		this.terminus = {x:this.origin.x+(multiplier*Math.sign(delta_x)), y:this.origin.y+(multiplier*slope*Math.sign(delta_x))};
	}

	this.changeMagnitude = function(length){
		this.setVector(this.terminus, length);
	}

	this.lockOrigin = function(){
		this.originLocked = true;
	}

	this.unlockOrigin = function(){
		this.originLocked = false;
	}

	this.cropPoly = function(polyVerts, topleft, bottomright){
		//Move inward 1 pixel for rounding errors
		if(this.farthestBound(polyVerts, "min", "x") < topleft.x){
			polyVerts = this.slicePoly(polyVerts, topleft.x+1, true)[1];
		}
		if(this.farthestBound(polyVerts, "max", "x") > bottomright.x){
			polyVerts = this.slicePoly(polyVerts, bottomright.x-1, true)[0];
		}
		if(this.farthestBound(polyVerts, "min", "y") < topleft.y){
			polyVerts = this.slicePoly(polyVerts, topleft.y+1, false)[0];
		}
		if(this.farthestBound(polyVerts, "max", "y") > bottomright.y){
			polyVerts = this.slicePoly(polyVerts, bottomright.y-1, false)[1];
		}
		return polyVerts;
	}

	this.slicePoly = function(polyVerts, line, vertical){
		//Adapted from https://github.com/MartyWallace/PolyK
		var that = this;
		var p = polyVerts;
		var a, b;
		//console.log("Slicing p="+JSON.stringify(p)+" at line "+line+" "+vertical);
		//console.log("Slicing at line "+line+" "+((vertical)?"vertically":"horizontally"));
		if(vertical){
			a = {x:line, y:this.farthestBound(p, "min", "y")-10};
			b = {x:line, y:this.farthestBound(p, "max", "y")+10};
		} else {
			a = {x:this.farthestBound(p, "min", "x")-10, y:line};
			b = {x:this.farthestBound(p, "max", "x")+10, y:line};
		}

		var iscs = [];	// intersections
		var ps = p;	// points

		for (var i = 0; i < ps.length; i++) {
			var isc = {x:0, y:0};
			// check if line AB intersects line P[i]P[i+1] (wraps to P[0] at end)
			isc = this.GetLineIntersection(a, b, ps[i], ps[(i + 1) % ps.length], isc);
			var fisc = iscs[0]; // first intersection
			var lisc = iscs[iscs.length - 1]; // last intersection
			// && (isc.x!=ps[i].x || isc.y!=ps[i].y) )
			//If an intersection is found and it is not a dupe of first or last count it
			if (isc && (fisc == null || this.distance(isc, fisc) > 1e-10) && (lisc == null || this.distance(isc, lisc) > 1e-10)) {
				isc.flag = true;
				iscs.push(isc);
				ps.splice(i + 1, 0, isc);
				i++;
			}
		}

		if (iscs.length < 2){return [p.slice(0)]};
		var comp = function (u, v){return that.distance(a, u) - that.distance(a, v);}
		iscs.sort(comp);

		//iscs now contains a sorted array of intersections with edges and line AB

		var pgs = [];
		var dir = 0;
		while (iscs.length > 0) {
			var i0 = iscs[0];
			var i1 = iscs[1];
			// if(i0.x==i1.x && i0.y==i1.y) { iscs.splice(0,2); continue;}
			var index0 = ps.indexOf(i0);
			var index1 = ps.indexOf(i1);
			var solved = false;

			if (this.firstWithFlag(ps, index0) === index1) {
				solved = true;
			} else {
				i0 = iscs[1];
				i1 = iscs[0];
				index0 = ps.indexOf(i0);
				index1 = ps.indexOf(i1);
				if (this.firstWithFlag(ps, index0) === index1) solved = true;
			}
			if (solved) {
				dir--;
				var pgn = this.getPoints(ps, index0, index1);
				pgs.push(pgn);
				ps = this.getPoints(ps, index1, index0);
				i0.flag = i1.flag = false;
				iscs.splice(0, 2);
				if (iscs.length === 0) pgs.push(ps);
			} else {
				dir++;
				iscs.reverse();
			}
			if (dir > 1){break;}
		}
		return pgs;
	}

	this.polyArea = function(polyVerts){
		//Adapted from https://github.com/MartyWallace/PolyK
		var p = polyVerts
		if (p.length < 3) return 0
		var l = p.length-1
		var sum = 0
		for (var i = 0; i < l; i++) {
			sum += (p[i+1].x - p[i].x) * (p[i].y + p[i+1].y)
		}
		sum += (p[0].x - p[l].x) * (p[l].y + p[0].y)
		return Math.abs(-sum * 0.5)
	}

	this.farthestBound = function(polyVerts, minmax, xy){
		//Given either "min" or "max" and "x" or "y", find the bound that fits that description
		if(minmax == "min"){
			return Math.min(...(polyVerts.map(vert => vert[xy])))
		} else if (minmax == "max"){
			return Math.max(...(polyVerts.map(vert => vert[xy])))
		}
		return null;
	}

	this.distance = function(a, b){
		var dx = b.x - a.x
		var dy = b.y - a.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	this.GetLineIntersection = function(a1, a2, b1, b2, c) {
		var dax = (a1.x - a2.x)
		var dbx = (b1.x - b2.x)
		var day = (a1.y - a2.y)
		var dby = (b1.y - b2.y)

		var Den = dax * dby - day * dbx

		if (Den === 0) { return null } // parallel

		var A = (a1.x * a2.y - a1.y * a2.x)
		var B = (b1.x * b2.y - b1.y * b2.x)

		var I = c
		I.x = (A * dbx - dax * B) / Den
		I.y = (A * dby - day * B) / Den

		if (this.InRectangle(I, a1, a2) && this.InRectangle(I, b1, b2)) {
			return I
		}
		return null
	}

	this.firstWithFlag = function(points, index){
		var n = points.length
		while (true) {
			index = (index + 1) % n
			if (points[index].flag) {
				return index
			}
		}
	}

	this.getPoints = function(points, index0, index1) {
		//Return points from index0 to index1, cycled
		var n = points.length
		var result = []
		if (index1 < index0) index1 += n
		for (var i = index0; i <= index1; i++) { result.push(points[i % n]) }
		return result
	}

	this.InRectangle = function(a, b, c) {
		var minx = Math.min(b.x, c.x)
		var maxx = Math.max(b.x, c.x)
		var miny = Math.min(b.y, c.y)
		var maxy = Math.max(b.y, c.y)

		if (minx === maxx) { return (miny <= a.y && a.y <= maxy) }
		if (miny === maxy) { return (minx <= a.x && a.x <= maxx) }

		// return (minx <= a.x && a.x <= maxx && miny <= a.y && a.y <= maxy)
		return (minx <= a.x + 1e-10 && a.x - 1e-10 <= maxx && miny <= a.y + 1e-10 && a.y - 1e-10 <= maxy)
	}

	this.clear = function(){
		context.clearRect(0, 0, canvas_width, canvas_height);
	}
}


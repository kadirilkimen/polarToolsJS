
/*

Copyright (c) 2021 kadir ilkimen

@license GPLv3
THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
For more information on licensing, please see the project repository:
https://github.com/kadirilkimen/gCodePolarizerJS

This software is designed to help modifying g-codes.
Incorrectly modified g-codes can be a dangerous thing.
Be aware of this, be careful and use this software at your own risk.



This library expects the given line objects to be compatible with gCodeLibJS:
https://github.com/kadirilkimen/gCodeLibJS

*/
'use strict';
window.gCodePolarizer = (function ()
{
  let oCopy = function(o){ return Object.assign({}, o); }

  return new function()
    {
      let Point = { X:0, Y:0, Z:0, E:0 }
      let PolarPoint = { R:0, A:0 }

      let _this = this;
      let currentPoint = oCopy(Point);
      let interpolatedPoint = oCopy(Point);

      let currentPolarPoint = oCopy(PolarPoint);

      _this.tolerance;
      _this.toolOffset;

      _this.interpolateG0;
      _this.interpolateG1;
      _this.g0HalfTolerance;

      let feedRate = 0;

      _this.reset = function()
        {
          currentPoint = oCopy(Point);
          interpolatedPoint = oCopy(Point);

          currentPolarPoint = oCopy(PolarPoint);

          _this.tolerance = 1;
          _this.toolOffset = 0;

          _this.interpolateG0 = false;
          _this.interpolateG1 = false;
          _this.g0HalfTolerance = false;
        }

      /////////////////////////////////////////////////////////////////////////
      // UTILITY FUNCTIONS
      let rad2deg = function(r) { return r * (180.0/Math.PI); }

      let lineLength = function(p1, p2, a1, a2)
        {
          a1 = typeof a1==='undefined' ? 'X':a1;
          a2 = typeof a2==='undefined' ? 'Y':a2;

          let powX = Math.pow( p1[a1]-p2[a1], 2.0 );
          let powY = Math.pow( p1[a2]-p2[a2], 2.0 );
          return Math.sqrt( powX+powY );
        }

      let getRadius = function( x, y ) { return Math.sqrt( Math.pow(x,2.0) + Math.pow(y,2.0) ); }

      let getAngle = function( x, y ) { return rad2deg( Math.atan2( x, y ) ); }

      let getAdjacent = function( h, o ){ return Math.sqrt( Math.abs( Math.pow(h,2.0) - Math.pow(o,2.0) ) ); }

      let absAngle = function(a)
        {
          if(a<0.0) { while(a<0.0){ a+=360.0; } }
          else if(a>360.0) { while(a>360.0){ a-=360.0; } }
          return a;
        }

      let axisDistance = function(p1, p2, axis){ return p2[axis] - p1[axis]; }

      let cartesianToPolar = function( x, y, offset, currentAngle )
        {
          let radius = getRadius( x, y );

          if( radius<offset) radius = offset;

          let pointAngle = getAngle( x, y );
          let angle = absAngle(pointAngle);
          let currentAbsAngle = absAngle(currentAngle);

          if(offset!=0)
            {
              let offsetRadius = getAdjacent(radius, offset);
              let offsetAngle = getAngle(offset, offsetRadius);
              radius = offsetRadius;
              offsetAngle = absAngle(offsetAngle);
              angle = absAngle(offsetAngle+angle);
            }

          let delta = angle - currentAbsAngle;
          if( Math.abs(delta) <= 180 ) angle = currentAngle + delta;
          else
            {
              if( currentAbsAngle > 180 ) angle = currentAngle+360+delta;
              else angle = currentAngle - (360-delta);
            }

          return { radius, angle };
        }

      /////////////////////////////////////////////////////////////////////////
      // interpolation of long straight lines.
      let prG = -1;
      _this.interpolate = function(line) // parsed Gcode line object
        {
          let lines = [line];
          let interpolate = true;
          let linePoint = oCopy( interpolatedPoint );
          if(!line.hasOwnProperty('G')) return lines; // if there is no any G command in the line, then nothing to interpolate


          let isG0 = line.G.includes(0);
          let isG1 = line.G.includes(1);
          let isG92 = line.G.includes(92);


          prG = line.G;
          if( isG92 )
            {
              // if G92 command is given, then we should set interpolatedPoint values
              interpolatedPoint.X = typeof line.X === 'undefined' ? interpolatedPoint.X:line.X;
              interpolatedPoint.Y = typeof line.Y === 'undefined' ? interpolatedPoint.Y:line.Y;
              interpolatedPoint.Z = typeof line.Z === 'undefined' ? interpolatedPoint.Z:line.Z;
              interpolatedPoint.E = typeof line.E === 'undefined' ? interpolatedPoint.E:line.E;
              return lines; // G command is 92, then nothing to interpolate.
            }

          linePoint.X = typeof line.X === 'undefined' ? linePoint.X:line.X;
          linePoint.Y = typeof line.Y === 'undefined' ? linePoint.Y:line.Y;
          linePoint.Z = typeof line.Z === 'undefined' ? linePoint.Z:line.Z;
          linePoint.E = typeof line.E === 'undefined' ? linePoint.E:line.E;


          if(!isG0 && !isG1 ) interpolate = false;
          else if(isG0 && !_this.interpolateG0 ) interpolate = false;
          else if(isG1 && !_this.interpolateG1 ) interpolate = false;


          let xyDistance = lineLength(interpolatedPoint, linePoint, 'X', 'Y');
          if( xyDistance<= _this.tolerance ) interpolate = false;

          if(interpolate)
            {
              lines = [];
              let t = _this.tolerance;
              if( isG0 && _this.g0HalfTolerance ) t = _this.tolerance * 2.0;
              let segments = Math.ceil( xyDistance /t );
              let segmentDistance = xyDistance/segments;

              // find segment distance for each axis
              let xLength = axisDistance( interpolatedPoint, linePoint, 'X') / segments;
              let yLength = axisDistance( interpolatedPoint, linePoint, 'Y') / segments;
              let zLength = axisDistance( interpolatedPoint, linePoint, 'Z') / segments;
              let eLength = axisDistance( interpolatedPoint, linePoint, 'E') / segments;


              // loop segments count times
              for(let i=1; i<=segments; i++)
                {
                  // in each loop, create a new line segment.
                  let segmentLine = oCopy(line);
                  if(i>1) delete segmentLine.F;
                  // assign this segment's point to next interpolated segment point
                  segmentLine.X = interpolatedPoint.X + (xLength*i);
                  segmentLine.Y = interpolatedPoint.Y + (yLength*i);

                  // if Z and E axes aren't exist in the line definition, ignore them.
                  // they don't need to be interpolated if they are not changed.
                  if( line.hasOwnProperty('Z') ) segmentLine.Z = interpolatedPoint.Z+(zLength*i);
                  if( line.hasOwnProperty('E') )
                    {
                      segmentLine.E = interpolatedPoint.E+(eLength*i);
                      //if(prG==92) console.info('G'+line.G+' E'+segmentLine.E);

                    }
                  
                  if(segmentLine.E==4157.59803) console.warn(segmentLine);
                  // push the line segment into lines
                  lines.push(segmentLine);
                }


            }
          
          // assign final linePoint to interpolated point record.
          // so in the next line interpolation, we will know where the last interpolated position is.
          interpolatedPoint.X = linePoint.X;
          interpolatedPoint.Y = linePoint.Y;
          interpolatedPoint.Z = linePoint.Z;
          interpolatedPoint.E = linePoint.E;

          // if there is any interpolated lines, return it, otherwise, return original line.
          // interpolate function always return array of line objects.
          // So, even if we don't interpolate the line, we return it in an array.
          if(lines.length>0) return lines;
          else return [line];
        }


      _this.polarize = function(line) // parsed g-code line object
        {
          // if it is not a motion command, then nothing to polarize
          if(!line.hasOwnProperty('G')) return false;

          let nextPoint = oCopy( currentPoint);
          let polarLine = oCopy( line );

          // we assign axis information to current point if available. otherwise we keep old one.
          // we will use this information to calculate polar coordinates.
          // also we have to remember the latest point for next ime.
          currentPoint.X = typeof line.X === 'undefined' ? currentPoint.X:line.X;
          currentPoint.Y = typeof line.Y === 'undefined' ? currentPoint.Y:line.Y;
          currentPoint.Z = typeof line.Z === 'undefined' ? currentPoint.Z:line.Z;
          currentPoint.E = typeof line.E === 'undefined' ? currentPoint.E:line.E;

          // if it is G92, then we simply return false. Because nothing to polarize.
          if(line.G.includes(92)) return line;

          let nextPolarPoint = oCopy(PolarPoint);

          feedRate = typeof line.F==='undefined' ? feedRate:line.F;

          // we polarize X and Y axis. If any of them available in the new line, we should polarize it.
          // if both axis is not available in the line, then nothing to polarize.
          if( line.hasOwnProperty('X') || line.hasOwnProperty('Y'))
            {
              let { radius, angle } = cartesianToPolar(currentPoint.X, currentPoint.Y, _this.toolOffset, currentPolarPoint.A );
              polarLine.X = radius;
              polarLine.Y = angle;

              currentPolarPoint.R = radius;
              currentPolarPoint.A = angle;

              /*
                Normally we have to recalculate the required feedrate here so we can keep the speed as high as possible.
                Unfortunately, calculating a good feedrate for every situation is very complex. I need to work on it more.
                Because cartesian-based g-code tools may or may not generate feedrates for cartesian motions.
                Firmwares may or may not change the given feedrates according to their capabilities and settings.
                So, this is a "to do" step for now.
                It is not a problem to use polarized g-code. It may reduce speed efficiency, but the machine should work fine.
              */
            }

          return polarLine;
        }


      _this.reset();

    };

}());

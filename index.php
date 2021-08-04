<!--

Copyright (c) 2021 kadir ilkimen

@license GPLv3
THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
For more information on licensing, please see the project repository:
https://github.com/kadirilkimen/polarToolsJS

This software is designed to help modify g-codes.
Incorrectly modified g-codes can be a dangerous thing.
Be aware of this, be careful and use this software at your own risk.

--><!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>polarTools</title>
    <link rel="stylesheet" href="css/styles.css" />
    <link rel="stylesheet" href="css/gcode.lib.css" />
    <link rel="icon" href="img/polarbear.svg" />
  </head>

  <body>
    <div class="wrapper">
      <div class="file-bar">
        <label for="fileInput"> Select a file </label>
        <input type="file" id="fileInput" accept=".nc, .cnc, .ngc, .gcode, .tap, .txt" />
        <div class="original-file-data" id="filePreview"></div>
      </div>

      <div class="options">
        <p class="basic-options">
          <label for="tolerance">Tolerance</label>
          <input type="text" value="1.0" id="tolerance"/>

          <label for="interpolateG0">Interpolate G0</label>
          <input type="checkbox" id="interpolateG0" checked/>

          <label for="g0HalfTolerance">1/2 resolution for G0</label>
          <input type="checkbox" id="g0HalfTolerance" checked/>


          <label for="interpolateG1">Interpolate G1</label>
          <input type="checkbox" id="interpolateG1" checked/>

          <label for="keepComments">Keep Comments</label>
          <input type="checkbox" id="keepComments" checked/>

          <label for="decimalPrecision">Decimal Precision</label>
          <input type="text" id="decimalPrecision" min="0" max="6" step="1" value="3"/>

        </p>

        <p>
          Cam softwares expect the machine to move on a straight path from the current point to the given point.
          Due to the rotary axis, polar machines follow an arc path.
          To fix this we need to split straight paths into smaller paths. "tolerance" means maximum path length. If a straight path is longer than this, it is divided into smaller paths until it is smaller than the "tolerance".


        <p>
          -------------------------------------------------
          <p class="basic-options">
            <label for="tolerance">Tool Offset</label>
            <input type="text" value="0.0" id="toolOffset"/>
            <p>Ideally, the tooltip should be perfectly aligned to the center of the polar axis. This is not always possible.
            If the tooltip has an offset, it will never be in the expected position.The final work will be warped, like looking through a magnifying glass.
            So, if you have an offset in your tooltip, enter the offset distance here. The pole angle and X axis distance will be realigned with respect to the offset line.</p>
            <p>We can fix the tooltip offset, but please note that it leaves an inaccessible circle in the center of the polar axis.</p>
          </p>
        </p>

        <p>
          --------------------------------------------------
          <p>Reassign Axis labels</p>
          <p class="axis-reassignment-options">
            <label for="reassignX">X</label>
            <select id="reassignX"><option value="X" selected>X</option><option value="Y">Y</option><option value="Z">Z</option><option value="E">E</option></select>

            <label for="reassignY">Y</label>
            <select id="reassignY"><option value="A">A</option><option value="X">X</option><option value="Y" selected>Y</option><option value="Z">Z</option><option value="E">E</option></select>

            <label for="reassignZ">Z</label>
            <select id="reassignZ"><option value="X">X</option><option value="Y">Y</option><option value="Z" selected>Z</option><option value="E">E</option></select>

            <label for="reassignE">E</label>
            <select id="reassignE"><option value="X">X</option><option value="Y">Y</option><option value="Z">Z</option><option value="E" selected>E</option></select>
          </p>
        </p>

        <p>
          --------------------------------------------------
          <p>
            <label for="reOrder">Reorder parameters?</label>
            <input type="checkbox" id="reOrder" checked/>

          </p>
        </p>

        <p>
          Polar movement requires different feedrates than a linear movement. This converter currently ignores the feedrate calculations.
          It doesn't affect the toolpath conversion. But it reduces the speed efficiency of the machine.
        </p>

        <p>
          <button id="polarizeButton" class="disabled">Polarize</button>
          <button id="saveButton" class="disabled">Save</button>
        </p>
      </div>

    </div>

    <script src="js/gcode.lib.js"></script>
    <script src="js/gcodePolarizer.js"></script>
    <script src="js/polarTools.js"></script>

    <script>

      // callback function for polarize button
      polarTools.onPolarize = function()
        {
          let gcodes = [];

          let line = false;
          while( line = polarTools.nextLine() )
            {
              if(!line) break;

              let parsedLine = GCode.parseLine(line);
              if(!parsedLine) continue;

              if( !parsedLine.hasOwnProperty('G') ) gcodes.push(parsedLine);
              else
                {
                  let interpolatedLine = gCodePolarizer.interpolate(parsedLine);
                  for( const line of interpolatedLine )
                    {
                      gcodes.push( gCodePolarizer.polarize(line) );
                    }
                }
            }

          let gCodeString = '';

          polarTools.print(false);
          polarTools.print('<ul class="gcode_list">');

          let printCount = 0;
          for( let line of gcodes)
            {
              gCodeString+= GCode.toString(line)+'\n';
              if(printCount<1000)
                {
                  polarTools.print(line);
                  printCount++;
                }
              else if(printCount==1000)
                {
                  polarTools.print('<li>html preview limit reached....</li>');
                  printCount++;
                }
            }

          polarTools.print('</ul>');

          polarTools.onSave = function(){ return gCodeString; }


          polarTools.unlockSave();

        }


      // initialize the polarTools
      polarTools.init();

    </script>
  </body>
</html>

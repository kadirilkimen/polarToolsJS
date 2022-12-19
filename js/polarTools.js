/*

Copyright (c) 2021 kadir ilkimen

@license GPLv3
THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
For more information on licensing, please see the project repository:
https://github.com/kadirilkimen/polarToolsJS

This software is designed to help modify g-codes.
Incorrectly modified g-codes can be a dangerous thing.
Be aware of this, be careful and use this software at your own risk.

*/
'use strict';

window.polarTools = ( function()
{

  return new function()
    {
      let _this = this;

      let wrapper;

      _this.printHtml = false;
      _this.reorderParameters = false;

      let lines = [];
      let nextLine = 0;
      let lineCount = 0;


      let tolerance;
      let interpolateG0;
      let interpolateG1;
      let g0HalfTolerance;
      let keepComments;
      
      let maximumR;
      let feedRateMultiplier;

      let toolOffset;


      let decimalPrecision;

      let reassignX;
      let reassignY;
      let reassignZ;
      let reassignE;
      
      let reassignA;
      let reassignB;
      let reassignC;
      

      let reOrder;

      let polarizeButton;
      let saveButton;

      /////////////////////////////////////////////////////////////////////////
      // file handling
      let fileData = '';

      let fileInput;
      let file;

      let filePreview;

      let onFileReady = function(){};

      let readFile = function()
        {
          lockUi();
          file = fileInput.files.item(0);

          if(file===null || file=== undefined) resetTool();
          else
            {
              const reader = new FileReader();
                    reader.readAsText(file);
                    reader.onload = function()
                      {
                        fileData = reader.result;
                        fileReady();
                      }
            }

        }


      let fileReady = function()
        {
          unlockUi();

          let unfilteredLines = fileData.split(/\r?\n/);
          lines = [];
          for(let i=0; i<unfilteredLines.length;i++)
            {
              let trimmedLine = unfilteredLines[i].trim();
              if(trimmedLine!='') lines.push(trimmedLine);
            }

          lineCount = lines.length;
          nextLine = 0;

          let previewData = fileData.substr(0,20000);
          if(previewData.length<fileData.length) previewData+='...<p>Preview limit reached...</p>';
          filePreview.innerHTML = '<pre>'+previewData+'</pre>';

          _this.unlockPolarize();
          onFileReady();
        }

      let saveFile = function()
        {
          _this.lockSave();
          let data = _this.onSave();
          if(data===undefined || data==false || data===null) return;

          const blob = new Blob([data], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);

            let extIndex = file.name.lastIndexOf('.');
            let polarizedFileName = file.name.substring(0, extIndex)+'-polarized'+file.name.substring(extIndex);

            const a = document.createElement('a');
            a.href = url;
            a.download = polarizedFileName;
            a.click();

            setTimeout(function(){ _this.unlockSave(); }, 1000 );
        }

      /////////////////////////////////////////////////////////////////////////
      // line iterator
      _this.nextLine = function()
        {
          if(nextLine>=lineCount) return false;
          let line = lines[nextLine];
          nextLine++;
          return line;
        }

      /////////////////////////////////////////////////////////////////////////
      // output
      _this.print = function(line)
        {
          if(!line) filePreview.innerHTML = '';
          else if(typeof line=='string') filePreview.innerHTML+=line;
          else filePreview.innerHTML+= '<li class="gcode_line">'+GCode.toHtml(line )+'</li>';
        }

      /////////////////////////////////////////////////////////////////////////
      // basic functions
      let lockUi = function(){ wrapper.classList.add('disabled'); }
      let unlockUi = function(){ wrapper.classList.remove('disabled'); }

      let resetTool = function()
        {
          fileData = '';
          lines = [];
          lineCount = 0;
          nextLine = 0;
          file = null;
          if(fileInput!==null) fileInput.value = '';
          if(filePreview!==null) filePreview.innerHTML = '';
          gCodePolarizer.reset();
          unlockUi();
          _this.lockSave();
        }

      _this.lockSave = function() { saveButton.classList.add('disabled'); }
      _this.unlockSave = function() { saveButton.classList.remove('disabled'); }

      _this.lockPolarize = function() { polarizeButton.classList.add('disabled'); }
      _this.unlockPolarize = function() { polarizeButton.classList.remove('disabled'); }


      /////////////////////////////////////////////////////////////////////////
      // setup polarizer
      _this.setupPolarizer = function()
        {
          gCodePolarizer.reset();
          gCodePolarizer.tolerance = Number(tolerance.value);
          gCodePolarizer.interpolateG0 = interpolateG0.checked;
          gCodePolarizer.interpolateG1 = interpolateG1.checked;
          gCodePolarizer.g0HalfTolerance = g0HalfTolerance.checked;

          gCodePolarizer.maxRadius = Number(maximumR.value);
          gCodePolarizer.feedRateMultiplier = Number(feedRateMultiplier.value)-1.0;

          gCodePolarizer.toolOffset = Number(toolOffset.value);

          GCode.reAssignAxes = {
              X:reassignX.value,
              Y:reassignY.value,
              Z:reassignZ.value,
              E:reassignE.value,
              A:reassignA.value,
              B:reassignB.value,
              C:reassignC.value
            }

          GCode.keepComments = keepComments.checked;
          GCode.reorder = reOrder.checked;
          let precision = parseInt(decimalPrecision.value);
          if(isNaN(precision)) alert('Decimal precision must be an integer and between 0-6');
          else GCode.decimalPrecision = parseInt(decimalPrecision.value);
        }

      _this.onPolarize = function(){};

      let polarizeGcode = function()
        {
          lockUi();
          _this.lockPolarize();
          _this.setupPolarizer();

          setTimeout(function()
            {

              _this.onPolarize();
              nextLine = 0;
              unlockUi();
              _this.unlockPolarize();
            });
        }




      let onSave = function(){};

      /////////////////////////////////////////////////////////////////////////
      // initialize the tool
      _this.init = function()
        {
          wrapper = document.querySelector('.wrapper');
          fileInput = document.querySelector('#fileInput');
          fileInput.addEventListener('change', readFile );
          filePreview = document.querySelector('#filePreview');


          tolerance = document.querySelector('#tolerance');
          interpolateG0 = document.querySelector('#interpolateG0');
          interpolateG1 = document.querySelector('#interpolateG1');
          g0HalfTolerance = document.querySelector('#g0HalfTolerance');
          keepComments = document.querySelector('#keepComments');

          maximumR = document.querySelector('#maximum-radius');
          feedRateMultiplier = document.querySelector('#feedrate-multiplier');

          toolOffset = document.querySelector('#toolOffset');
          decimalPrecision = document.querySelector('#decimalPrecision');

          reassignX = document.querySelector('#reassignX');
          reassignY = document.querySelector('#reassignY');
          reassignZ = document.querySelector('#reassignZ');
          reassignE = document.querySelector('#reassignE');
          
          reassignA = document.querySelector('#reassignA');
          reassignB = document.querySelector('#reassignB');
          reassignC = document.querySelector('#reassignC');
          

          reOrder = document.querySelector('#reOrder');

          polarizeButton = document.querySelector('#polarizeButton');
          saveButton = document.querySelector('#saveButton');

          polarizeButton.addEventListener('mouseup', polarizeGcode );
          saveButton.addEventListener('mouseup', saveFile );
        }

    };

}());

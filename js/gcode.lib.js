/*

Copyright (c) 2021 kadir ilkimen

@license GPLv3
THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.
For more information on licensing, please see the project repository:
https://github.com/kadirilkimen/gCodeLibJS

This software is designed to help modify g-codes.
Incorrectly modified g-codes can be a dangerous thing.
Be aware of this, be careful and use this software at your own risk.

*/
'use strict';

window.GCode = (function ()
{
  return new function()
    {
      let _this = this;


			// regex for matching g-code parameters
			let parseExpression = /([A-Z]\s*)([+-]?\d*\.?\d+)|([\;\|\/\#])(.+)/ig;

      _this.decimalPrecision = 3;
      _this.keepComments = true;

			// paramter ordering list while converting a line into a string or html
			// unlisted parameters will be added to the end of line
			let parameterOrderingList = [ 'M', 'G', 'A', 'X', 'Y', 'Z', 'E', 'F', 'S' ];
      _this.reorder = true;

      _this.reAssignAxes = { X:'X', Y:'Y', Z:'Z', E:'E' }


      _this.reset = function()
        {
          _this.reAssignAxes = { X:'X', Y:'Y', Z:'Z', E:'E' }
        }

      /////////////////////////////////////////////////////////////////////////
			// string to line object parser
			_this.parseLine = function ( line ) // gcode line string
				{
					if ( line===undefined ) return false;
					let trimmedLine = line.trim();
					if ( trimmedLine== '' ) return false;
					let params = {};

					let match;
					while ( ( match = parseExpression.exec( trimmedLine ) ) !== null)
						{
						    if (match.index === parseExpression.lastIndex) parseExpression.lastIndex++;

								let comment = ''

								if ( match.length>3 )
									{
										if( match[1]!=undefined ) // match[1] = parameter
											{
												match[1] = match[1].trim().toUpperCase();
												if( match[2]!=undefined ) match[2] = Number(match[2].trim() ); // match[2] = value;

												if( match[1]=='G' )
													{
														if( !params.hasOwnProperty('G') ) params.G = [];
														params.G.push( match[2] );
													}
												else params[ match[1] ] = match[2];
											}

										if( match[3]!== undefined && _this.keepComments) params.comment = match[3] + match[4]; // match[3] = comment delimiter, match[4] = comment content
									}
						}

          let paramKeys = Object.keys(params)
          if(paramKeys.length==0) return false;

					return params;
				}


      /////////////////////////////////////////////////////////////////////////
			// string array to line object array parser
			_this.parseGCode = function( lines ) // gcode line string array
				{
					let parsedLines = [];

					for( let i = 0; i< lines.length; i++)
						{
							let parsedLine = _this.parseLine(lines[i]);
							if(parsedLine != false ) parsedLines.push( parsedLine );
						}

					return parsedLines;
				}


      /////////////////////////////////////////////////////////////////////////
			// line parameter into a string
			let paramToString = function(line, p, toHtml)
				{
					let paramStrings = [];
					let html_in = '';
					let html_out = '';


					if(p=='G')
						{
							for(let gi=0; gi<line[p].length; gi++)
								{
									paramStrings.push( 'G'+line[p][gi] );
								}
						}
					else
            {

              paramStrings.push( p + parseFloat(line[p].toFixed(_this.decimalPrecision) ) );
            }

					return paramStrings.join(' ');
				}


      /////////////////////////////////////////////////////////////////////////
			// line parameter to an html span
			let paramToHtml = function (line, p)
				{
					return '<span class="gcode_'+p+'">'+paramToString(line, p)+'</span>';
				}


      /////////////////////////////////////////////////////////////////////////
			// create a fromatted string or html from a gcode line object
			let formatGCodeLine = function( orgLine, toHtml )
				{
					let line = Object.assign({}, orgLine);
					let paramStrings = [];
					let paramToFunc = toHtml ? paramToHtml: paramToString;

          let reAssignedLine = {};


					let originalLineParams = Object.keys(line);

          for(let p of originalLineParams )
            {
              let targetParam = _this.reAssignAxes[p] || p;
              reAssignedLine[targetParam] = line[p];
            }

          line = reAssignedLine;
          let lineParams = Object.keys(line);

          let commentIndex = lineParams.indexOf('comment');
          if(commentIndex>=0) lineParams.splice(lineParams.indexOf('comment'), 1);
					if( _this.reorder )
						{
							for( const p of parameterOrderingList )
								{
									if(lineParams.includes(p))
										{
											paramStrings.push( paramToFunc(line, p, toHtml) );
											lineParams.splice(lineParams.indexOf(p), 1);
										}
								}
						}

					for( const p of lineParams )
						{
							paramStrings.push( paramToFunc(line, p) );
						}

					if( line.hasOwnProperty('comment') && line.comment!='')
						{
							paramStrings.push( toHtml? '<span class="gcode_comment">'+line.comment+'</span>' : line.comment );
						}

          if(paramStrings.length>0 ) return paramStrings.join(' ').trim();
          else return false;
        }


      /////////////////////////////////////////////////////////////////////////
			// create a fromatted string from a gcode line object
			_this.toString = function( orgLine ) //  parsed Line object
				{
					return formatGCodeLine( orgLine, false );
				}


      /////////////////////////////////////////////////////////////////////////
			// create a fromatted html li object from a gcode line object
			_this.toHtml = function( orgLine )  //  parsed Line object
				{
					return formatGCodeLine( orgLine, true );
				}
    };

}());

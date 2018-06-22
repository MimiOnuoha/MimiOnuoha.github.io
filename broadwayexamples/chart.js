// --------- Setting up base variables for chart  ----------------------
var isBroadwayMode = true;
var isNonProfitMode = false;

var queue = d3_queue.queue();

var margin = { top: 10, right: 120, bottom: 30, left: 120 },
  width = 1200 - margin.left - margin.right,
  height = 700 - margin.top - margin.bottom;

var y = d3.scale.ordinal()
  .rangeRoundBands([height, 0], .1);

var x = d3.scale.linear()
  .rangeRound([0, width]);

var color = d3.scale.ordinal()
  .range(["561A44", "#009380", "C50A3C", "FEC22D", "FC583C", ])

var yAxis = d3.svg.axis()
  .scale(y)
  .orient("left")
  .innerTickSize(-width)
  .outerTickSize(0)
  .tickPadding(10);

var xAxis = d3.svg.axis()
  .scale(x)
  .orient("bottom")
  .innerTickSize(-height)
  .outerTickSize(0)
  .tickPadding(10);

var tip = d3.tip() //For tooltips 
  .attr('class', 'tooltip')
  .offset([-10, 0])
  .html(function(d) {
    return "<span style='color:white'> " + (d.y1 - d.y0) + " <strong>" + (d.name) + " </strong>actors </span> (" + Math.round((d.yp1 - d.yp0) * 100) + "%)";
  })

var infoBox = d3.tip() // Info box that comes up upon click 
  .attr('class', 'info-box')
  .offset([200, -10])
  .html(function(d) {
    console.log(d)
    return "<h2>" + d.show + "</h2> </br><span style='color:#561A44'> African American: " + (d["African American"]) + "</span>" + "</br> <span style='color:#009380'> Asian Americans: " + (d["Asian American"]) + "</span>" + "</br> <span style='color:#C50A3C'> Caucasians: " + (d["Caucasian"]) + "</span>" + "</br> <span style='color:#FEC22D'> Latinos: " + (d["Latino"]) + "</span>" + "</br> <span style='color:#FC583C'> Others: " + (d["Other"]) + "</br> ";
  })

var svg = d3.select("#broadway-svg").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("font-family", "Fira Sans")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var dropDown = d3.select("#filter").append("select")
  .attr("name", "season_list");

svg.call(tip);
svg.call(infoBox);


// --------- Functions to be used later on for chart  ----------------------
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width*3) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

function make_x_axis_gridlines() {
  return d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(3) //change this to 5 if you want
}

function make_y_axis_gridlines() {
  return d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(3)
}

function create_legend_text() {
  var legend = svg.selectAll(".legend") //this is a hack! Need to change, shouldn't have to declare this twice
  legend.append("text")
    .attr("x", width + 30)
    .attr("y", 9)
    .attr("dy", ".35em")
    .attr("class", "legend-text")
    .style("text-anchor", "start")
    .text(function(d) {
      return d;
    })
    .attr("font-family", "Fira Sans");

  return legend;
}

// --------- Loading data ----------------------
queue
  .defer(d3.csv, "data/broadway.csv")
  .defer(d3.csv, "data/offbroadway.csv")
  .await(analyze);

function analyze(error, broadway, nonprofit) {
  if (error) throw error;
 
  // -------- Structuring Broadway Data ------------------------
  var nestedBroadway = d3.nest()
    .key(function(d) {
      return d["year"];
    })
    .key(function(d) {
      return d["show"];
    })
    .entries(broadway)

  var createdKey = "show"; // This key will be used to combine all of the ethnic data with each particular show
  var nestedWithValues = embedValuesForStackedBars(nestedBroadway, createdKey);

  color.domain(d3.keys(nestedWithValues[0]["values"][0]).filter(function(key) { // Mapping ethnicities to colors
    if (key !== "show" && key !== "numbers") {
      return key;
    }
  }).sort());

  var summedBroadway = sumsAndPercentagesForStackedBars(nestedWithValues)

  var broadwayOptions = dropDown.selectAll("option")
    .data(summedBroadway.sort(function(a, b) {
      return b.total - a.total;
    }))
    .enter()
    .append("option");

  broadwayOptions.text(function(d) {
      return d.key;
    })
    .attr("value", function(d) {
      return d.key;
    });

//------------ Structuring Off-Broadway Data -----------------------
  var nestedNonProfit = d3.nest()
    .key(function(d) {
      return d["year"];
    })
    .key(function(d) {
      return d["show"];
    })
    .entries(nonprofit)

  var createdKeyNonProfit = "show"; // Because in off-Broadway, the indexing is by theatre but we call it show
  var nestedWithValuesNonProfit = embedValuesForStackedBars(nestedNonProfit, createdKeyNonProfit);
  var summedNonProfit = sumsAndPercentagesForStackedBars(nestedWithValuesNonProfit)


// --------- Helper functions for transforming data ----------------------
  function embedValuesForStackedBars(dataset, createdKey) {
    var newDataset = dataset.map(function(shows) {
      var yearKey = shows["key"]
      var newValues = shows.values.map(function(group) {
        var row = {};
        row[createdKey] = group["key"];
        for (var i = 0; i < group["values"].length; i++) {
          var value = group["values"][i];
          row[value["ethnicity"]] = +value["actors"];
        }
        return row;
      });
      return { key: yearKey, values: newValues };
    });
    return newDataset;
  };

  function sumsAndPercentagesForStackedBars(dataset) {
    dataset.forEach(function(year) {
      year.values.forEach(function(d) {
        var y0 = 0;
        d.numbers = color.domain().map(function(name) {
          var row = { name: name, amount: +d[name], y0: y0, yp0: y0 };
          y0 += +d[name];
          row.y1 = y0;
          row.yp1 = y0;
          return row;
        });
        d.numbers.forEach(function(d) {
          d.yp0 /= y0;
          d.yp1 /= y0;
        });
        d.total = d.numbers[d.numbers.length - 1].y1;
      })
    })
    return dataset
  };

  // --------- Setting up charts  ----------------------
  updateBroadwayChart(broadwayOptions.text(), summedBroadway);

  initGrid()
  initStaticElements()

  function initGrid() {
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", "translate(0," + height + ")")
      .call(make_x_axis_gridlines()
        .tickSize(-height, 0, 0)
        .tickFormat("")
      )

    svg.append("g")
      .attr("class", "grid")
      .call(make_y_axis_gridlines()
        .tickSize(-width, 0, 0)
        .tickFormat("")
      )
  }

  // -------------- Updating and setting up the Non-profit Chart --------
  function updateNonProfitChart(selection, nonprofitData) {
    var color = d3.scale.ordinal() // NOTE: there must be a better way than defining this twice
      .range(["561A44", "#009380", "C50A3C", "FEC22D", "FC583C", ])

    var yearData = nonprofitData.filter(function(year) {
      return year.key == selection
    })
    var filteredData = yearData[0].values.sort(function(a, b) {
      return b.total - a.total;
    });

    var filteredData = yearData[0].values

    y.domain(filteredData.map(function(d) {
      return d.show }));
    // x.domain([0, d3.max(filteredData, function(d) { return d.total + 1 })])
    x.domain([0, 130]) // nonprofit 

    // X-axis
    svg.append("g")
      .attr("class", "x-text")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text")
      .text("Actors")
      .attr("x", width / 2 - 30)
      .attr("y", 40)
      .attr("font-family", "Fira Sans")
      .style("font-size", 12)


    // Y-axis
    svg.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .append("text")
      .attr("transform","rotate(-90)")
      .attr("y", -150)
      .attr("x", -120)
      .attr("dy", ".71em")
      .attr("class", "y-axis y-text")
      .style("text-anchor", "end")
      .style("font-size", 12)
      .attr("font-family", "Fira Sans");
    svg.select(".y.axis")
      .style("font-size", "10px");
    svg.selectAll(".tick text")
      .call(wrap, y.rangeBand());
    svg.selectAll("text")
      .attr("transform", function(d){
        return "translate(-10,-1)"
      });

    var toggle;
    var show = svg.selectAll(".show")
      .data(filteredData)

    show.exit() // EXIT
      .transition()
      .style('fill-opacity', 1e-6)
      .remove();

    // show.transition()  // Transition just for newly entering nodes 
    //   .style('fill-opacity', 1e-6)
    // show.transition()
    //   .style('fill-opacity', 1)
    //   .duration(400)
    //   .delay(function(d, i) {
    //     return i * 10;
    //   })

    show.enter().append("g") // ENTER
      .attr("class", "show")

    show.attr("transform", function(d) { // UPDATE
        return "translate(0," + y(d.show) + ")";
      })
      .on('click', function(d, i) {
        if (toggle) {
          infoBox.show(d);
          toggle = null;

          var self = this;
          var bars = d3.selectAll('.show');
          bars.filter(function(x) {
              return self != this;
            })
            .style("opacity", ".3");
        } else {
          infoBox.hide(d);
          toggle = svg.append("toggle");
          var self = this;
          var bars = d3.selectAll('.show');
          bars.filter(function(x) {
              return self != this;
            })
            .style("opacity", "1");
        }
      });

    var rect = show.selectAll("rect")
      .data(function(d) {
        return d.numbers;
      })

    rect.exit().remove(); //exit
    rect.enter().append("rect") //enter
    rect.attr("height", y.rangeBand()) //update
      .attr("x", function(d) {
        return x(d.y0);
      })
      .attr("width", function(d) {
        return x(d.y1) - x(d.y0);
      })
      .style("fill", function(d) {
        return color(d.name);
      })
      .style("opacity", "1")
      .on('mouseover', function(d) {
        tip.show(d);
        d3.select(this).style("opacity", ".6");
      })
      .on('mouseout', function(d) {
        tip.hide(d);
        d3.select(this).style("opacity", "1");
      });
  }

  // --------------- Updating the Broadway Chart -----------------
  function updateBroadwayChart(selection, broadwayData) {
    var color = d3.scale.ordinal() // NOTE: there must be a better way than defining this twice
      .range(["561A44", "#009380", "C50A3C", "FEC22D", "FC583C", ])

    var yearData = broadwayData.filter(function(year) {
      return year.key == selection
    })
    var filteredData = yearData[0].values.sort(function(a, b) {
      return b.total - a.total;
    });

    var filteredData = yearData[0].values

    y.domain(filteredData.map(function(d) {
      return d.show }));
    // x.domain([0, d3.max(filteredData, function(d) { return d.total + 1 })])
    x.domain([0, 71]) // broadway

    // X-axis
    svg.append("g")
      .attr("class", "x-text")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text")
      .text("Actors")
      .attr("x", width / 2 - 30)
      .attr("y", 40)
      .attr("font-family", "Fira Sans")
      .style("font-size", 12)

    // Y-axis
    svg.append("g")
      .attr("class", "y-axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -150)
      .attr("x", -120)
      .attr("dy", ".71em")
      .attr("class", "y-axis y-text")
      .style("text-anchor", "end")
      .style("font-size", 12)
      .attr("font-family", "Fira Sans");
    svg.select(".y.axis")
      .style("font-size", "10px");
// ------ Word Wrap for these labels not yet working 
    // svg.selectAll(".tick text")
    //   .call(wrap, y.rangeBand() * 2.5);
    // svg.selectAll("text")
    //   .attr("transform", function(d){
    //     return "translate(-10,-1)"
    //   });


    var toggle;
    var show = svg.selectAll(".show")
      .data(filteredData)

    show.exit() // EXIT
      // .transition()
      // .style('fill-opacity', 1e-6)
      .remove();

    // show.transition()  // Transition just for newly entering nodes 
    //   .style('fill-opacity', 1e-6)
    // show.transition()
    //   .style('fill-opacity', 1)
    //   .duration(400)
    //   .delay(function(d, i) {
    //     return i * 10;
    //   })

    show.enter().append("g") // ENTER
      .attr("class", "show")

    show.attr("transform", function(d) { // UPDATE
        return "translate(0," + y(d.show) + ")";
      })
      .on('click', function(d, i) {
        if (toggle) {
          infoBox.show(d);
          toggle = null;

          var self = this;
          var bars = d3.selectAll('.show');
          bars.filter(function(x) {
              return self != this;
            })
            .style("opacity", ".3");
        } else {
          infoBox.hide(d);
          toggle = svg.append("toggle");
          var self = this;
          var bars = d3.selectAll('.show');
          bars.filter(function(x) {
              return self != this;
            })
            .style("opacity", "1");
        }
      });

    var rect = show.selectAll("rect")
      .data(function(d) {
        return d.numbers;
      })

    rect.exit().remove(); //exit
    rect.enter().append("rect") //enter
    rect.attr("height", y.rangeBand()) //update
      .attr("x", function(d) {
        return x(d.y0);
      })
      .attr("width", function(d) {
        return x(d.y1) - x(d.y0);
      })
      .style("fill", function(d) {
        return color(d.name);
      })
      .style("opacity", "1")
      .on('mouseover', function(d) {
        tip.show(d);
        d3.select(this).style("opacity", ".6");
      })
      .on('mouseout', function(d) {
        tip.hide(d);
        d3.select(this).style("opacity", "1");
      });
  }

  function initStaticElements() {
    var legend = svg.selectAll(".legend")
      .data(color.domain().slice().reverse())
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) {
        return "translate(-180," + i * 20 + ")";
      });
    legend.append("rect")
      .attr("x", width)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);
    legend.append("text")
      .attr("x", width + 30)
      .attr("y", 9)
      .attr("dy", ".35em")
      .attr("class", "legend-text")
      .style("text-anchor", "start")
      .text(function(d) {
        return d;
      })
      .attr("font-family", "Fira Sans");
  }

  dropDown.on("change", function() {
    var selected = this.value;
    svg.selectAll('text').remove();
    create_legend_text();

    if (isBroadwayMode === true) {
      updateBroadwayChart(selected, summedBroadway);
    } else {
      updateNonProfitChart(selected, summedNonProfit)
    }
  });

  // --------------- Transitions from Broadway to Non-profit -----------------
  function transitionBroadway() {
    svg.selectAll('text').remove();
    create_legend_text();
    updateBroadwayChart("2008-2009", summedBroadway);

    isBroadwayMode = true;
    isNonProfitMode = false;
  }

  function transitionNonProfit() {
    svg.selectAll('text').remove();
    create_legend_text();
    updateNonProfitChart("2008-2009", summedNonProfit);

    isNonProfitMode = true;
    isBroadwayMode = false;
  }

  // Controls for switching between Broadway and Non-profit 
  d3.selectAll("input").on("change", handleFormClick);

  function handleFormClick() {
    if (this.value === "broadway") {
      transitionBroadway();
    } else {
      transitionNonProfit();
    }
  }
}
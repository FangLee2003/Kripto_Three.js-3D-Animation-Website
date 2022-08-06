var option = {
    bezierCurve: true,
    legend: {
        display: false,
    },
    scales: {
        xAxes: [{
            gridLines: {
                display: false,
                drawBorder: false,
            },
            ticks: {
                display: false,
            }
        }],
        yAxes: [{
            gridLines: {
                display: false,
                drawBorder: false,
            },
            ticks: {
                display: false,
                beginAtZero: true,
            }
        }]
    },
    elements: {
        point: {
            radius: 0
        }
    }
};

var lineChart = document.getElementsByClassName("marketcap-canvas");
if (lineChart.length > 0) {
    for (let chart of lineChart) {
        let data = JSON.parse(chart.dataset.charts);
        let border = chart.dataset.border;

        let canvas = chart.querySelector('canvas');
        let ctx = canvas.getContext('2d');

        let lineChartData = {
            labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
            datasets: [
                {
                    backgroundColor: 'rgba(0, 0, 0, 0)',
                    borderColor: '#' + border,
                    data: data,
                    bezierCurve: true
                }
            ]
        }
        new Chart(ctx, {
            type: "line",
            data: lineChartData,
            options: option
        });
    }
}
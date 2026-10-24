let port;
let reader;

const connectButton = document.getElementById("connectButton");

const connectionStatus = document.getElementById("status");
const connectionIndicator = document.getElementById("connectionIndicator");

const attendanceStatus = document.getElementById("attendanceStatus");
const attendanceIcon = document.getElementById("attendanceIcon");
const attendanceMessage = document.getElementById("attendanceMessage");

const rssiText = document.getElementById("rssi");
const arrivalText = document.getElementById("arrival");
const departureText = document.getElementById("departure");
const durationText = document.getElementById("duration");
const lastSeenText = document.getElementById("lastSeen");

const historyTable = document.getElementById("attendanceHistory");

let arrivalDate = null;

const RSSI_THRESHOLD = -75;


// --------------------------------
// CONNECT BUTTON
// --------------------------------

connectButton.addEventListener("click", connectESP32);


// --------------------------------
// CONNECT ESP32
// --------------------------------

async function connectESP32() {

    try {

        port = await navigator.serial.requestPort();

        await port.open({
            baudRate: 115200
        });


        connectButton.textContent =
            "ESP32 Connected";

        connectButton.disabled = true;


        connectionStatus.textContent =
            "CONNECTED";

        connectionIndicator.style.background =
            "#16a34a";


        readSerialData();

    }

    catch (error) {

        console.error(error);

        connectionStatus.textContent =
            "CONNECTION FAILED";

        connectionIndicator.style.background =
            "#dc2626";

    }

}


// --------------------------------
// READ SERIAL DATA
// --------------------------------

async function readSerialData() {

    const decoder =
        new TextDecoderStream();


    port.readable.pipeTo(
        decoder.writable
    );


    reader =
        decoder.readable.getReader();


    let buffer = "";


    while (true) {

        const { value, done } =
            await reader.read();


        if (done) {
            break;
        }


        buffer += value;


        const lines =
            buffer.split("\n");


        buffer = lines.pop();


        for (let line of lines) {

            line = line.trim();


            if (line.length > 0) {

                processData(line);

            }

        }

    }

}


// --------------------------------
// PROCESS ESP32 DATA
// --------------------------------

function processData(line) {

    console.log("ESP32:", line);


    // --------------------------------
    // DEVICE PRESENT
    // --------------------------------

    if (line === "ATTENDANCE:PRESENT") {

        setPresent();

    }


    // --------------------------------
    // DEVICE ABSENT
    // --------------------------------

    else if (line === "ATTENDANCE:ABSENT") {

        setAbsent();

    }


    // --------------------------------
    // RSSI
    // --------------------------------

    else if (line.startsWith("RSSI:")) {

        const rssi =
            parseInt(
                line.substring(5)
            );


        rssiText.textContent =
            rssi + " dBm";


        // Determine presence from RSSI

        if (rssi >= RSSI_THRESHOLD) {

            setPresent();

        }

    }


    // --------------------------------
    // ARRIVAL
    // --------------------------------

    else if (line.startsWith("ARRIVAL:")) {

        arrivalDate =
            new Date();


        arrivalText.textContent =
            arrivalDate.toLocaleTimeString();


        departureText.textContent =
            "--";


        durationText.textContent =
            "--";

    }


    // --------------------------------
    // LAST SEEN
    // --------------------------------

    else if (line.startsWith("LAST_SEEN:")) {

        const now =
            new Date();


        lastSeenText.textContent =
            now.toLocaleTimeString();

    }


    // --------------------------------
    // DURATION
    // --------------------------------

    else if (line.startsWith("DURATION:")) {

        const seconds =
            parseInt(
                line.substring(9)
            );


        durationText.textContent =
            formatDuration(seconds);

    }


    // --------------------------------
    // DEPARTURE
    // --------------------------------

    else if (line.startsWith("DEPARTURE:")) {

        const durationValue =
            durationText.textContent;


        if (
            arrivalDate &&
            durationValue !== "--"
        ) {

            const durationSeconds =
                parseDurationText(
                    durationValue
                );


            const departureDate =
                new Date(
                    arrivalDate.getTime() +
                    durationSeconds * 1000
                );


            departureText.textContent =
                departureDate.toLocaleTimeString();


            // Save attendance record

            saveAttendanceRecord(
                arrivalDate,
                departureDate,
                durationSeconds
            );

        }

    }

}


// --------------------------------
// SET PRESENT
// --------------------------------

function setPresent() {

    attendanceStatus.textContent =
        "PRESENT";


    attendanceStatus.style.color =
        "#16a34a";


    attendanceIcon.style.color =
        "#16a34a";


    attendanceMessage.textContent =
        "D4C is currently within the classroom range.";

}


// --------------------------------
// SET ABSENT
// --------------------------------

function setAbsent() {

    attendanceStatus.textContent =
        "ABSENT";


    attendanceStatus.style.color =
        "#dc2626";


    attendanceIcon.style.color =
        "#dc2626";


    attendanceMessage.textContent =
        "D4C is currently outside the classroom range.";

}


// --------------------------------
// FORMAT DURATION
// --------------------------------

function formatDuration(seconds) {

    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        seconds % 60;


    return `${hours}h ${minutes}m ${secs}s`;

}


// --------------------------------
// PARSE DURATION
// --------------------------------

function parseDurationText(text) {

    const match =
        text.match(
            /(\d+)h\s+(\d+)m\s+(\d+)s/
        );


    if (!match) {

        return 0;

    }


    const hours =
        parseInt(match[1]);


    const minutes =
        parseInt(match[2]);


    const seconds =
        parseInt(match[3]);


    return (
        hours * 3600 +
        minutes * 60 +
        seconds
    );

}


// --------------------------------
// SAVE ATTENDANCE RECORD
// --------------------------------

function saveAttendanceRecord(
    arrival,
    departure,
    duration
) {

    // Get existing records

    let records =
        JSON.parse(
            localStorage.getItem(
                "attendanceRecords"
            )
        ) || [];


    // Create new record

    const record = {

        date:
            arrival.toLocaleDateString(),

        arrival:
            arrival.toLocaleTimeString(),

        departure:
            departure.toLocaleTimeString(),

        duration:
            formatDuration(duration)

    };


    // Add newest record at the top

    records.unshift(record);


    // Save records

    localStorage.setItem(
        "attendanceRecords",
        JSON.stringify(records)
    );


    // Update webpage

    displayAttendanceHistory();

}


// --------------------------------
// DISPLAY ATTENDANCE HISTORY
// --------------------------------

function displayAttendanceHistory() {

    if (!historyTable) {
        return;
    }


    let records =
        JSON.parse(
            localStorage.getItem(
                "attendanceRecords"
            )
        ) || [];


    historyTable.innerHTML = "";


    if (records.length === 0) {

        historyTable.innerHTML = `
            <tr>
                <td colspan="4">
                    No attendance records yet.
                </td>
            </tr>
        `;

        return;

    }


    records.forEach(function(record) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${record.date}
            </td>

            <td>
                ${record.arrival}
            </td>

            <td>
                ${record.departure}
            </td>

            <td>
                ${record.duration}
            </td>

        `;


        historyTable.appendChild(row);

    });

}


// --------------------------------
// LOAD HISTORY WHEN PAGE OPENS
// --------------------------------

displayAttendanceHistory();
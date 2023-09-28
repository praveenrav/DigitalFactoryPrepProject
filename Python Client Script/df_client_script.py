import sys
import requests
import time
import json
import xml.etree.ElementTree as ET


def check_server_status():
    """ Method to perform test connection to the web server using the /api/status endpoint: """
    url_stat = "http://localhost:3000/1.0.0/api/status"

    # Sending GET request to check server status:
    res_stat = requests.get(url_stat)

    if res_stat.status_code == 200:
        print("Succesfully connected to server.")
    else:
        print("Cannot check server status.")
        sys.exit()


def check_server_version():    
    """ Method to check the server version """
    
    url_vers = "http://localhost:3000/1.0.0/api/version"

    # Sending GET request to check server version:
    res_vers = requests.get(url_vers)

    if res_vers.status_code == 200:
        data = res_vers.json()
        print(data["version"])
    else:
        print("Cannot check server version.")


def launch_probe():
    """ Method to launch a probe to the MTConnect agent: """
    
    # Probe URL:
    url_probe = 'https://smstestbed.nist.gov/vds/probe'
    res_probe = requests.get(url_probe)

    if res_probe.status_code != 200:
        print("Cannot launch a probe to the MTConnect agent.")
        sys.exit()

    # print("Launched probe to the MTConnect agent.")

    # XML file information:
    root = ET.fromstring(res_probe.text)
    default_ns = {'m': 'urn:mtconnect.org:MTConnectDevices:1.3'}

    # Creating equipment and data dictionary entries:
    equip_list = []  # List to eventually contain dictionary entries for each equipment/device
    data_list = []  # List to eventually contain dictionary entries for each data

    devices = root.findall(".//m:Device", namespaces=default_ns)

    for device in devices:
        device_id = device.get("id")
        device_name = device.get("name")
        device_uuid = device.get("uuid")

        description_data = device.find(".//m:Description", namespaces=default_ns)

        if description_data is None:
            continue

        device_manufacturer = description_data.get("manufacturer")
        device_model = description_data.get("model")
        device_description = description_data.text

        equip_dict = {'deviceId': device_id, 'deviceName': device_name, 'deviceUUID': device_uuid, 'manufacturer': device_manufacturer, 'model': device_model}
        equip_list.append(equip_dict)
        
        data_items = device.findall(".//m:DataItems/m:DataItem", namespaces=default_ns)
        
        if data_items is None:
            continue
            
        for data_item in data_items:
            data_item_category = data_item.get("category")
            data_item_id = data_item.get("id")
            data_item_name = data_item.get("name")
            data_item_type = data_item.get("type")

            data_dict = {'category': data_item_category, 'id': data_item_id, 'deviceUUID': device_uuid, 'name': data_item_name, 'type': data_item_type}
            data_list.append(data_dict)

        
        
    # Sending equipment and data dictionary entries to MongoDB via Node.js application:
    url_equip = "http://localhost:3000/1.0.0/api/equipmentDictionary/write"
    res_equip = requests.post(url_equip, json = equip_list)
    
    # Sending equipment dictionary entries:
    if res_equip.status_code == 200:
        data = res_equip.json()
        print("Successfully written equipment dictionary to the server.")
    elif res_equip.status_code == 402:
        print("At least 1 invalid equipment dictionary.")
    elif res_equip.status_code == 500:
        print("Failed to connect to the database.")    
    else:
        print(res_equip.status_code)
    
    # Sending data dictionary entries:
    url_data = "http://localhost:3000/1.0.0/api/dataDictionary/write"
    res_data = requests.post(url_data, json = data_list)
    
    # Sending data dictionary entries:
    if res_data.status_code == 200:
        print("Successfully written data dictionary to the server.")
    elif res_data.status_code == 402:
        print("At least 1 invalid data dictionary.")
    elif res_data.status_code == 500:
        print(res_data.reason)
    else:
        print(res_data.status_code)


def launch_current():
    """ Launching a current to the MTConnect agent: """
    
    # Current URL:
    url_current = 'https://smstestbed.nist.gov/vds/current'
    res_current = requests.get(url_current)
    
    # Exit the program if the status code is not 200
    if res_current.status_code != 200:
        print("Cannot launch a current to the MTConnect agent.")
        sys.exit()    
    
    # Receive the value of nextSequence, and extract associated relevant data
    nextSequence = extract_influx_data(url_current)

    return nextSequence
    



def extract_influx_data(url_in):
    """ This method is used to receive an ElementTree object, extract the various relevant data points within the HTML/XML data,
    and send a POST request to the server to write the data to the InfluxDB database. """

    # Creating empty list to eventually store all relevant data to be sent to server to write onto InfluxDB database:
    influxdb_data = []
    
    # Launching sample:
    res_sample = requests.get(url_in)
    
    if res_sample.status_code != 200:
        print("Unsuccessful connection to sample.")
        return False
    
    root = ET.fromstring(res_sample.text)    
    namespaces = {
    'm': 'urn:mtconnect.org:MTConnectStreams:1.3',
    'x': 'urn:nist.gov:NistStreams:1.3'
    }
    
    header = root.find(".//m:Header", namespaces=namespaces)
    nextSequence = header.get("nextSequence")
    
    device_streams = root.findall(".//m:Streams/m:DeviceStream", namespaces=namespaces)

    for device in device_streams:
        samples = device.findall(".//m:ComponentStream/m:Samples", namespaces=namespaces)
        
        for sample in samples:
            sample_elements = sample.findall("./*")
            
            for element in sample_elements:
                
                # Extracting measurement category:
                measurement = str(element.tag)
                measurement_parts = element.tag.split("}", 1)
                
                if len(measurement_parts) == 2:
                    measurement = measurement_parts[1].strip()
                
                # Extracting relevant tags (data item ID):
                dataItemId_str = element.get("dataItemId")
                
                # Extracting time stamp:
                timestamp = element.get('timestamp')

                # Initializing dictionary for current data point:
                data_point = {"measurement": measurement}
                
                if timestamp:
                    data_point["timestamp"] = timestamp
                                    
                data_value = element.text
                if data_value == 'UNAVAILABLE':
                    continue
                
                # Extracting data values, accounting for whether the current data value is a single data point or a set of coordinates:
                if measurement != "PathPosition":
                    
                    tags = {"dataItemId":  dataItemId_str}
                    data_point["tags"] = tags
                    
                    fields = {"value": data_value}
                    data_point["fields"] = fields
                    
                    influxdb_data.append(data_point)

                else:
                    
                    # If three different coordinates are present within a single string, separate the string into substrings corresponding to the individual coordinates
                    coords = data_value.split()
                    
                    # Afterwards, save each individual coordinate as its own data point, modifying the dataItemIDas necessary:
                    for i in range(3):
                        
                        # Setting data item ID:
                        if i == 0:
                            dataItemId_str_coor = dataItemId_str + "_X"
                        elif i == 1:
                            dataItemId_str_coor = dataItemId_str + "_Y"
                        elif i == 2:
                            dataItemId_str_coor = dataItemId_str + "_Z"
                        
                        tags = {"dataItemId":  dataItemId_str_coor}
                        data_point["tags"] = tags
                        
                        # Setting data value:
                        fields = {"value": coords[i]}
                        data_point["fields"] = fields
                        
                        # Adding the data point:
                        influxdb_data.append(data_point)    
                    

    # Posting InfluxDB data to database:
    url_influx_write = "http://localhost:3000/1.0.0/api/data/write"
    res_influx = requests.post(url_influx_write, json = influxdb_data)   
    
    if res_influx.status_code == 200:
        data = res_influx.json()
        print("Successfully written InfluxDB data to server.")
    elif res_influx.status_code == 402:
        print("At least 1 invalid command.")
    elif res_influx.status_code == 500:
        print("Failed to connect to the database.")    
    else:
        print(res_influx.status_code)
                         
    return nextSequence


# Main method:
if __name__ == "__main__":

    # Checking server status:
    check_server_status()
    
    # Checking server version:
    check_server_version()
    
    # Launching probe to the MTConnect Agent:
    launch_probe()    

    # Launching current to the MTConnect Agent:
    nextSequence = launch_current()

    # Launching a sample to the MTConnect agent, setting loop to run every samp_time seconds:
    url_sample = 'https://smstestbed.nist.gov/vds/sample'
    url_in = url_sample + "?from=" + str(nextSequence) # Input URL accounting for value of nextSequence
    samp_time = 5 # Sampling time
    time_prev = time.time()
    
    while True:
    
        # Following sample time:
        time_cur = time.time()
        
        if time_cur - time_prev < samp_time:
            continue
        
        # Extracting relevant data and newly updated value of nextSequence variable, and sending data to server to write to InfluxDB:
        nextSequence = extract_influx_data(url_in)
        
        # If the above method did not run successfully, simply continue to the next iteration. Else, update the new input URL for the next iteration.
        if nextSequence == False:
            continue
        else:
            url_in = url_sample + "?from=" + str(nextSequence)
 
        time_prev = time_cur # Setting current time equal to previous time now that sample has been successfully been launched
        
        

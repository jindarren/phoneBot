import requests
import json
import pprint

import sys

from tool import load_data,store_data



pp = pprint.PrettyPrinter(indent=4)


# user information
user_id = '23'




user_profile_data = 'data/user_profile_phone_after_initialization.json'
# user_profile_data = 'data/user_profile_phone.json'

# user_profile_data = 'data/user_profile_phone_v3_for_test_updated.json'
# user_profile_data = 'data/user_profile_phone_for_test_updated.json'

user_profile = load_data.load_json_data(user_profile_data)
# 
test_function = 'initialize_user_model'
test_function = 'update_user_model'
test_function = 'get_rec'
test_function = 'get_sys_cri'
test_function = 'trigger_sys_cri'

url = ''
parms = ''
    

if test_function == 'initialize_user_model':
	url ="http://127.0.0.1:5000/initialize_user_model"

if test_function == 'update_user_model':
	url ="http://127.0.0.1:5000/update_user_model"

if test_function == 'get_rec':
	url ="http://127.0.0.1:5000/get_rec"
	
if test_function == 'get_sys_cri':
	url ="http://127.0.0.1:5000/get_sys_cri"

parms = {
    'user_profile': user_profile,
    'sys_crit_version': 'preference_oriented'
}

for i in range(2):
	res = requests.post(url, data=json.dumps(parms))  # request API to return results
	print(i)

 
text = res.text
text_json = json.loads(json.loads(text))
pp.pprint(text_json)
# user_profile = text_json[0]
# pp.pprint(user_profile)
# print(len(user_profile['pool']))

# store_data.store_data_to_json(text_json, "data/user_profile_phone_after_initialization.json")
# with open("data/user_preference_model.json", 'w') as user_pref_file:
# 	json.dump(text_json, user_pref_file, indent=4)
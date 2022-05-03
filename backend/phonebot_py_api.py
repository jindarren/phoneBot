import json
import time
from flask import Flask, g, Response
from flask import jsonify, request
from flask_restful import reqparse, Api, Resource
# from flask_httpauth import HTTPTokenAuth

from function import user_modeling, recommendation, system_critiquing, dialog_management
from tool import time_helper,load_data
import pprint
import copy


pp = pprint.PrettyPrinter(indent=4)

# Flask declaration
app = Flask(__name__)
api = Api(app)
 

# considered_attributes (selected)
# categorical_attributes = ['brand','nettech','os1', 'nfc', 'year', 'fullscreen']
# numerical_attributes = ['phone_size', 'phone_thickness','phone_weight', 'resolution', 'camera', 'storage', 'ram','displaysize', 'battery', 'price','popularity']

categorical_attributes = ['brand','nettech','os1', 'nfc', 'year', 'fullscreen']
numerical_attributes = ['phone_size', 'phone_weight', 'camera', 'storage', 'ram', 'price']

#  Load Phone Data
phone_data_file = 'data/new_phone_data.json'
phone_data = load_data.load_json_data(phone_data_file)
 # 'id' in music domain and 'id' in phone domain 

#  Load Phone Data
key = 'id'
item_pool = copy.deepcopy(phone_data['pool'])
item_info_dict = {}
for item in item_pool:
    item_info_dict[item[key]] = item
time_helper.print_current_time()
print("Load Phone Data (%d)---- Done!" % len(item_pool))


# 操作（post / get）资源列表
class InitializeUserModel(Resource):
    def post(self):
        start = time.process_time()
        time_helper.print_current_time()
        print("Initialize User Model ---- start")


        json_data = request.get_json(force=True)
        user_profile = json_data['user_profile']
        user_preference_data = user_profile['user']['preferenceData'] # initial preference data: a list of ids of phones that user preferred 

        # initialize the user preference model ** using user preference data
        # preference model consists of two parts: attribute frequency and preference value for each attribute
        user_preference_model = user_modeling.initialize_user_preference_model(user_preference_data, item_info_dict, categorical_attributes, numerical_attributes)
        user_profile['user']['user_preference_model'] = user_preference_model

        time_helper.print_current_time()
        print("Initialize User Model ---- Part 1: User Preference Model --- Done!")

        # initialize the user critique preference (empty)
        user_critique_preference = []
        user_profile['user']['user_critique_preference'] =  user_critique_preference

        time_helper.print_current_time()
        print("Initialize User Model ---- Part 2: User Critique Preference (empty) --- Done!")

        # initialize the user constraints (empty)
        user_constraint = []
        user_profile['user']['user_constraints'] =  user_constraint
        time_helper.print_current_time()
        print("Initialize User Model ---- Part 3: User Constraints (empty) --- Done!")


        ### -------------------------------------------------------------- 
        ### obtain initial recommendations (top 150 based on MAUT)
        initial_recommendations_list = []
        top_K = 150
        method = 'MAUT'
        alpha = 0.5
        topK_recommendations_score_dict = recommendation.compute_recommendation(user_preference_model, user_critique_preference, item_pool, top_K, \
                categorical_attributes, numerical_attributes, method, key, alpha)
       
        if len(topK_recommendations_score_dict) > 0:
            for rec in topK_recommendations_score_dict:
                initial_recommendations_list.append(rec[0])
        user_profile['pool'] = initial_recommendations_list

        time_helper.print_current_time()
        print("Obtain initial recommendation (top 150) based on MAUT --- Done!")

        end = time.process_time()
        time_helper.print_current_time()
        print ('Initialize User Model ---- run time : %ss ' % str(end-start))

        return json.dumps(user_profile)

class UpdateUserModel(Resource):
    
    def post(self):
        start = time.process_time()
        time_helper.print_current_time()
        print("Update User Model ---- start")


        json_data = request.get_json(force=True)
        user_profile = json_data['user_profile']
        user_interaction_dialog = user_profile['logger']['latest_dialog']
        user_browsed_items = user_profile['logger']['browsedItems']
        user_model = user_profile['user']
        current_recommended_item = user_profile['topRecommendedItem']
        key = 'id'
        # update the user model (three parts)
        updated_user_preference_model, updated_user_constraints, updated_user_critique_preference = user_modeling.update_user_model(user_model, \
            user_interaction_dialog, user_browsed_items, current_recommended_item, categorical_attributes, numerical_attributes, key, item_info_dict)
        user_profile['user']['user_preference_model'] = updated_user_preference_model
        user_profile['user']['user_constraints'] = updated_user_constraints
        user_profile['user']['user_critique_preference'] = updated_user_critique_preference
        
        # update the user interaction log 
        # for log in user_interaction_dialog:
        #     user_profile['logger']['dialog'].append(copy.deepcopy(log))
        
        # user_profile['logger']['latest_dialog'] = []
        
        end = time.process_time()
        time_helper.print_current_time()
        print ('Update User Model ---- run time : %ss ' % str(end-start))

        return json.dumps(user_profile)
 
class GetRec(Resource):
 
    def post(self):

        start = time.process_time()
        time_helper.print_current_time()
        print("Get Recommendation ---- start")


        json_data = request.get_json(force=True)
        user_profile = json_data['user_profile']
        user_preference_model = user_profile['user']['user_preference_model'] 
        user_critique_preference = user_profile['user']['user_critique_preference'] 
        user_constraints = user_profile['user']['user_constraints'] 
        item_pool_name_list = user_profile['pool']
        new_item_pool_name_list = user_profile['new_pool']

        item_pool = []
        user_pool_item_info_dict = {}
        for item in item_pool_name_list:
            item_pool.append(item_info_dict[item])
            user_pool_item_info_dict[item] = item_info_dict[item]

        new_item_pool = []
        new_pool_item_info_dict = {}
        for item in new_item_pool_name_list:
            new_item_pool.append(item_info_dict[item])
            new_pool_item_info_dict[item] = item_info_dict[item]




        # Filter the items that the user has browsed 
        # user_interaction_log = user_profile['logger']
        # user_browsed_items = user_interaction_log['browsedItems']
        # for item_key in user_browsed_items:
        #     item_info = item_info_dict[item_key]
        #     item_pool.remove(item_info)
        # time_helper.print_current_time()
        # print("Filter Phone Data ---- Filter %d items that the user has browsed, %d items left. -- Done!" % (len(user_browsed_items), len(item_pool)))


        top_K = 20
        method = 'MAUT_COMPAT' # (1) MAUT (2) COMPAT (3) MAUT_COMPAT
        alpha = 0.5 # Linear combination weight: alpha-> weight for MAUT score; 1-alpha -> weight for COMPAT score

        minimal_threshold = 20
        time_helper.print_current_time()
        print("Get Recommendation ---- Method: %s (alpha:%f)." % (method,alpha)) 
         
        topK_recommendations_score_dict = {}
        if len(new_item_pool) > 0:
            topK_recommendations_score_dict = recommendation.compute_recommendation(user_preference_model, user_critique_preference, new_item_pool, top_K, \
                categorical_attributes, numerical_attributes, method, key, alpha)
        else: 
            filtered_item_pool = recommendation.filter_items_by_user_constraints(user_constraints, item_pool, minimal_threshold,\
                categorical_attributes, numerical_attributes, key)
        
            time_helper.print_current_time()
            print("Filter by User Constraints --- after filtering, %d items left." % len(filtered_item_pool))
                
            if len(filtered_item_pool) > 0:
                topK_recommendations_score_dict = recommendation.compute_recommendation(user_preference_model, user_critique_preference, filtered_item_pool, top_K, \
                    categorical_attributes, numerical_attributes, method, key, alpha)

        topK_recommendation_list = []
        if len(topK_recommendations_score_dict) > 0:
            for rec in topK_recommendations_score_dict:
                topK_recommendation_list.append(rec[0])
        time_helper.print_current_time()
        print("Get Recommendation ---- Obtained top %d recommended items. "% len(topK_recommendation_list)) 
        

        updated_item_pool = []

        if len(new_item_pool) > 0:
            time_helper.print_current_time()
            print("Get Recommendation ---- New Pool: %d songs." % (len(new_item_pool))) 
            time_helper.print_current_time()
            print("Get Recommendation ---- Original Item Pool: %d songs." % (len(item_pool))) 
            integrated_item_pool = new_item_pool + item_pool 
            assert(len(integrated_item_pool) == len(item_pool) + len(new_item_pool))

            max_item_pool_number = min([150, len(integrated_item_pool)])
            updated_item_pool = recommendation.update_recommendation_pool(user_preference_model, user_critique_preference, new_item_pool, integrated_item_pool, max_item_pool_number, categorical_attributes, numerical_attributes, method, alpha)
            print("Get Recommendation ---- Updated Item Pool: %d songs." % (len(updated_item_pool))) 
            
            user_profile['pool'] = updated_item_pool
            user_profile['new_pool'] = []

        recommendation_and_user_profile = {'recommendation_list': topK_recommendation_list, 'user_profile': user_profile}
        
        end = time.process_time()
        time_helper.print_current_time()
        print ('Get Recommendation ---- run time : %ss ' % str(end-start))


        return json.dumps(recommendation_and_user_profile), 201

class GetSysCri(Resource):
 
    def post(self):

        start = time.process_time()
        time_helper.print_current_time()
        print("Get System Critiques ---- start")



        json_data = request.get_json(force=True)
        user_profile = json_data['user_profile']
        user_preference_model = user_profile['user']['user_preference_model'] 
        user_critique_preference = user_profile['user']['user_critique_preference'] 
        user_constraints = user_profile['user']['user_constraints'] 
        item_pool_name_list = user_profile['pool']
        new_item_pool_name_list = user_profile['new_pool']

        user_interaction_log = user_profile['logger']

        cur_rec = user_profile['topRecommendedItem']
        cur_rec = copy.deepcopy(item_info_dict[cur_rec])

        item_pool = []
        user_pool_item_info_dict = {}
        for item in item_pool_name_list:
            item_pool.append(item_info_dict[item])
            user_pool_item_info_dict[item] = item_info_dict[item]
        time_helper.print_current_time()

     
        new_item_pool = []
        new_pool_item_info_dict = {}
        for item in new_item_pool_name_list:
            new_item_pool.append(item_info_dict[item])
            new_pool_item_info_dict[item] = item_info_dict[item]


        top_K = 3
        unit_or_compound = [1,2]
        

        item_pool_for_SC = item_pool
        new_item_pool_state = False

        if len(new_item_pool) > 0:
            new_item_pool_state = True
            item_pool_for_SC = new_item_pool

        time_helper.print_current_time()
        print("Get System Critiques ---- Item Pool: %d songs" % len(item_pool_for_SC))

        # whether or not to filter recommendation using hard constraints
        # minimal_threshold = 150
        # filtered_item_pool = recommendation.filter_items_by_user_constraints(user_constraints, item_pool, minimal_threshold,\
        #     categorical_attributes, numerical_attributes, key)
        # time_helper.print_current_time()
        # print("Filter By User Constraints --- after filtering, %d phones left." % len(filtered_item_pool))

        # filtered_item_pool = item_pool
        method = 'MAUT_COMPAT'
        alpha = 0.5
        top_k_candidates = 150

        # top_k_candidates = min([top_k_candidates, len(filtered_item_pool)])
        estimated_score_dict = recommendation.compute_recommendation(user_preference_model, user_critique_preference, item_pool_for_SC, len(item_pool_for_SC), categorical_attributes, numerical_attributes, method, key, alpha, sort=True)
        time_helper.print_current_time()
        print("Get System Critiques ---- Obtain item utility score by %s method (alpha:%f) --- Done." %(method, alpha))

        
        sorted_candidated_list = []
        for rec in estimated_score_dict:
            sorted_candidated_list.append(rec[0])
        

        estimated_score_dict = dict(estimated_score_dict)
        selected_item_pool = []
        for item in item_pool:
            if item[key] in sorted_candidated_list:
                selected_item_pool.append(item)
        time_helper.print_current_time()
        print('select %d recommendation for generating critiques.' % len(selected_item_pool))



        sys_crit_version = 'preference_oriented' # preference_oriented / diversity_oriented / personality_adjusted
        time_helper.print_current_time()
        print("Get System Critiques ---- system critique generation version: %s" % sys_crit_version)

        state = 'SC_and_Recommendation'
        sys_crit = None
        sys_crit = system_critiquing.generate_system_critiques_preference_oriented(user_preference_model,  user_critique_preference, estimated_score_dict, selected_item_pool, cur_rec, top_K, unit_or_compound, categorical_attributes , numerical_attributes, key)



        time_helper.print_current_time()
        print(state)
        # time_helper.print_current_time()
        # pp.pprint(sys_crit)
        sys_crit_with_rec_list = {'state': state, 'result': sys_crit}

        end = time.process_time()
        time_helper.print_current_time()
        print ('Get System Critiques ---- run time : %ss ' % str(end-start))

        return json.dumps(sys_crit_with_rec_list), 201


class TriggerSysCri(Resource):
 
    def post(self):

        start = time.process_time()
        time_helper.print_current_time()
        print("Determine Whether to Trigger System Critiques ---- start")

        json_data = request.get_json(force=True)
        user_profile = json_data['user_profile']
        user_interaction_log = user_profile['logger']
        cur_rec = user_profile['topRecommendedItem']

        results_triggerSC = dialog_management.determine_trigger_sc_or_not(user_interaction_log, cur_rec, categorical_attributes, numerical_attributes)
        
        determination_triggerSC = {'triggerSC': results_triggerSC}

        time_helper.print_current_time()
        print ('Results of Determination of trigger SC : %s.' % determination_triggerSC['triggerSC'])

        end = time.process_time()
        time_helper.print_current_time()
        print ('Determine Whether to Trigger System Critiques ---- run time : %ss ' % str(end-start))

        return json.dumps(determination_triggerSC), 201



# 设置路由，即路由地址为http://127.0.0.1:5000/xxx
api.add_resource(InitializeUserModel, "/initialize_user_model") 
api.add_resource(UpdateUserModel, "/update_user_model") 
api.add_resource(GetRec, "/get_rec")
api.add_resource(GetSysCri, "/get_sys_cri")
api.add_resource(TriggerSysCri, "/trigger_sys_cri")
 
if __name__ == "__main__":
    server = '127.0.0.1'
    port =  '5000'
    app.run(debug=True, host= server, port=port)

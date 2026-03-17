from bson import ObjectId
from bson.decimal128 import Decimal128
from datetime import datetime

def serialize_mongo(obj):
    if isinstance(obj, list):
        return [serialize_mongo(item) for item in obj]

    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, Decimal128):
                result[k] = float(v.to_decimal())
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            else:
                result[k] = serialize_mongo(v)
        return result

    return obj


export class CreatedObject{
    ActionUUID: string;
    ObjectKey: string;
    UserUUID: string;
    UserType: string;
    DeviceType: string;
    ActivityType: string;

    constructor(ActionUUID: string, ObjectKey: string, UserUUID: string, ActivityType: string){
          this.ActionUUID = ActionUUID;
          this.ObjectKey = ObjectKey;
          this.UserUUID = UserUUID;
          this.ActivityType= ActivityType;
          this.UserType = ''
          this.DeviceType = ''
    }
}
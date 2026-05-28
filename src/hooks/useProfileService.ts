type ProfileFormValues = {
  id: string;
    full_name: string;
    email: string;
    bio: string;
}
import {supabase} from '../../createClient';
const useProfileService = (ProfileData: ProfileFormValues) => {
    const submitProfileUpdate = async (data: ProfileFormValues) => {
        try {
        // Insert into Supabase table directly
        const { data, error } = await supabase
          .from('profiles')
          .insert([ ProfileData]);

        if (error) console.error('Upload error:', error);
        else console.log('Successfully saved to DB');
        return data;
        }
        catch(e){
            console.log(e);
        }
    }
    return  {submitProfileUpdate}

}
export default useProfileService;
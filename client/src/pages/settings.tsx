import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Crown,
  AlertTriangle
} from "lucide-react";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  hasActiveSubscription?: boolean;
  mfaEnabled?: boolean;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: subscriptionStatus } = useQuery<{ hasActiveSubscription: boolean; status: string }>({
    queryKey: ["/api/subscription-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      return await apiRequest("PUT", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await apiRequest("POST", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Password Change Failed",
        description: "Failed to change password. Please check your current password.",
        variant: "destructive",
      });
    },
  });

  const handleProfileUpdate = (field: string, value: any) => {
    updateProfileMutation.mutate({ [field]: value });
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
        <div className="flex">
          <Sidebar />
          <div className="flex-1 ml-64">
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <Skeleton className="h-8 w-48 mb-8" />
                <div className="grid gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-white">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64">
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                  <p className="text-gray-600 mt-2">Manage your account preferences and security settings</p>
                </div>
                {subscriptionStatus?.hasActiveSubscription && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300">
                    <Crown className="w-4 h-4 mr-1" />
                    Premium Account
                  </Badge>
                )}
              </div>

              <div className="grid gap-6">
                {/* Profile Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Profile Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profile?.firstName || ""}
                          onChange={(e) => handleProfileUpdate("firstName", e.target.value)}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profile?.lastName || ""}
                          onChange={(e) => handleProfileUpdate("lastName", e.target.value)}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profile?.username || ""}
                        onChange={(e) => handleProfileUpdate("username", e.target.value)}
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile?.email || ""}
                        onChange={(e) => handleProfileUpdate("email", e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profile?.phone || ""}
                        onChange={(e) => handleProfileUpdate("phone", e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <Switch
                        checked={profile?.mfaEnabled || false}
                        onCheckedChange={(checked) => handleProfileUpdate("mfaEnabled", checked)}
                      />
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-base font-medium">Change Password</Label>
                        <Button
                          variant="outline"
                          onClick={() => setShowChangePassword(!showChangePassword)}
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          {showChangePassword ? "Cancel" : "Change Password"}
                        </Button>
                      </div>

                      {showChangePassword && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                              <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                            />
                          </div>
                          <Button
                            onClick={handlePasswordChange}
                            disabled={!currentPassword || !newPassword || !confirmPassword || changePasswordMutation.isPending}
                            className="w-full"
                          >
                            {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="w-5 h-5 mr-2" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-500" />
                        <div>
                          <Label className="text-base font-medium">Email Notifications</Label>
                          <p className="text-sm text-gray-600">Receive updates and alerts via email</p>
                        </div>
                      </div>
                      <Switch
                        checked={profile?.emailNotifications !== false}
                        onCheckedChange={(checked) => handleProfileUpdate("emailNotifications", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Smartphone className="w-4 h-4 mr-2 text-gray-500" />
                        <div>
                          <Label className="text-base font-medium">SMS Notifications</Label>
                          <p className="text-sm text-gray-600">Receive alerts via text message</p>
                        </div>
                      </div>
                      <Switch
                        checked={profile?.smsNotifications || false}
                        onCheckedChange={(checked) => handleProfileUpdate("smsNotifications", checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Subscription Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Subscription Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscriptionStatus?.hasActiveSubscription ? (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <Crown className="w-5 h-5 text-yellow-600 mr-3" />
                          <div>
                            <p className="font-medium text-green-800">Premium Plan Active</p>
                            <p className="text-sm text-green-600">You have access to all premium features</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div className="flex items-center">
                          <AlertTriangle className="w-5 h-5 text-orange-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-800">Free Plan</p>
                            <p className="text-sm text-gray-600">Upgrade to Premium for advanced features</p>
                          </div>
                        </div>
                        <Button variant="default" className="bg-gradient-to-r from-blue-600 to-purple-600">
                          Upgrade to Premium
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
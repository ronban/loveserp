//
//  CommonCertificateProviderVersion.h
//
// Static class containing information about the CommonCertificateProvider library. This header is
// private and may change in future versions without further notice as it's only for
// informational purposes and should not be used for other things in an application.
//
//  Copyright (c) 2014 SAP AG. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface CommonCertificateProviderVersion : NSObject

/**
 Retrieves the ID of the library
 @remark generated on the build server
 */
+(NSString*)libraryName;

/**
 Retrieves the version number of the library
 @remark generated on the build server
 */
+(NSString*)version;

/**
 Retrieves the build time of the library
 @remark generated on the build server
 */
+(NSString*)buildTime;

/**
 Retrieves the git commitID of the last pushed change
 @remark generated on the build server
 */
+(NSString*)gitCommit;

/**
 Retrieves the git branch name
 @remark generated on the build server
 */
+(NSString*)gitBranch;

/**
 Retrieves the the name and the version of the library
 @remark generated on the build server
 */
+(NSString*)versionAll;

@end

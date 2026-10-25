import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    alias(libs.plugins.android)
}

// A thin Android shell around the ../web folder. The same files are published to GitHub Pages
// and packaged here as assets, so all of the coloring-book code is shared between both.
android {
    namespace = "io.github.coolchan03.coloringbook"
    compileSdk = project.libs.versions.app.build.compileSDKVersion.get().toInt()

    defaultConfig {
        applicationId = "io.github.coolchan03.coloringbook"
        minSdk = project.libs.versions.app.build.minimumSDK.get().toInt()
        targetSdk = project.libs.versions.app.build.targetSDK.get().toInt()
        // Every CI run gets a higher versionCode so a new APK installs over the old one.
        val code = providers.environmentVariable("GITHUB_RUN_NUMBER").orNull?.toIntOrNull() ?: 1
        versionCode = code
        versionName = "1.0.$code"
    }

    // A fixed key (committed on purpose: this is a personal app, not a store release) so that
    // every build is signed the same way and updates install over the previous version.
    signingConfigs {
        register("shared") {
            storeFile = file("coloringbook.keystore")
            storePassword = "coloringbook"
            keyAlias = "coloringbook"
            keyPassword = "coloringbook"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("shared")
        }
        release {
            signingConfig = signingConfigs.getByName("shared")
            isMinifyEnabled = false
        }
    }

    sourceSets {
        getByName("main").java.directories.add("src/main/kotlin")
        getByName("main").assets.directories.add("../web")
    }

    compileOptions {
        val javaVersion = JavaVersion.valueOf(libs.versions.app.build.javaVersion.get())
        sourceCompatibility = javaVersion
        targetCompatibility = javaVersion
    }

    tasks.withType<KotlinCompile> {
        compilerOptions.jvmTarget.set(
            JvmTarget.fromTarget(project.libs.versions.app.build.kotlinJVMTarget.get())
        )
    }
}

dependencies {
    implementation(libs.androidx.webkit)
}

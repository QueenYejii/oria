module oria::space_registry {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_SPACE_EXISTS: u64 = 3;
    const E_SPACE_NOT_FOUND: u64 = 4;
    const E_NOT_CREATOR: u64 = 5;
    const E_NOT_PAID_SPACE: u64 = 6;
    const E_ALREADY_PURCHASED: u64 = 7;

    const VISIBILITY_PUBLIC: u8 = 0;
    const VISIBILITY_WALLET_GATED: u8 = 1;
    const VISIBILITY_PAID: u8 = 2;

    const ACCESS_PUBLIC: u8 = 0;
    const ACCESS_ALLOWLIST: u8 = 1;
    const ACCESS_CREATOR_ONLY: u8 = 2;
    const ACCESS_PAID: u8 = 3;

    const PAYMENT_APT: u8 = 0;
    const PAYMENT_SHELBY_USD: u8 = 1;

    struct Registry has key {
        spaces: Table<String, SpaceRecord>,
        space_ids: vector<String>,
        creator_spaces: Table<address, vector<String>>,
        purchases: Table<String, vector<address>>,
        allowlists: Table<String, vector<address>>,
        creator_profiles: Table<address, CreatorProfile>,
    }

    struct CreatorProfile has store, drop {
        creator: address,
        display_name: String,
        bio: String,
        avatar_blob_name: String,
        links_blob_name: String,
        updated_at_micros: u64,
    }

    struct SpaceRecord has store, drop {
        space_id: String,
        creator: address,
        network: String,
        manifest_blob_name: String,
        manifest_hash: vector<u8>,
        manifest_version: u64,
        visibility: u8,
        access_rule: u8,
        price_octas: u64,
        payment_currency: u8,
        payment_asset: address,
        created_at_micros: u64,
        updated_at_micros: u64,
    }

    #[event]
    struct SpaceRegistered has drop, store {
        space_id: String,
        creator: address,
        network: String,
        manifest_blob_name: String,
        manifest_hash: vector<u8>,
        manifest_version: u64,
        visibility: u8,
        access_rule: u8,
        price_octas: u64,
        payment_currency: u8,
        payment_asset: address,
        created_at_micros: u64,
    }

    #[event]
    struct SpaceUpdated has drop, store {
        space_id: String,
        creator: address,
        manifest_blob_name: String,
        manifest_hash: vector<u8>,
        manifest_version: u64,
        updated_at_micros: u64,
    }

    #[event]
    struct SpacePurchased has drop, store {
        space_id: String,
        creator: address,
        buyer: address,
        price_octas: u64,
        payment_currency: u8,
        payment_asset: address,
        purchased_at_micros: u64,
    }

    #[event]
    struct CreatorProfileUpdated has drop, store {
        creator: address,
        display_name: String,
        bio: String,
        avatar_blob_name: String,
        links_blob_name: String,
        updated_at_micros: u64,
    }

    public entry fun initialize(admin: &signer) {
        let registry_address = signer::address_of(admin);
        assert!(!exists<Registry>(registry_address), E_ALREADY_INITIALIZED);

        move_to(admin, Registry {
            spaces: table::new<String, SpaceRecord>(),
            space_ids: vector::empty<String>(),
            creator_spaces: table::new<address, vector<String>>(),
            purchases: table::new<String, vector<address>>(),
            allowlists: table::new<String, vector<address>>(),
            creator_profiles: table::new<address, CreatorProfile>(),
        });
    }

    public entry fun update_creator_profile(
        creator: &signer,
        registry_address: address,
        display_name: String,
        bio: String,
        avatar_blob_name: String,
        links_blob_name: String,
    ) acquires Registry {
        assert!(exists<Registry>(registry_address), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_address);
        let creator_address = signer::address_of(creator);
        let now = timestamp::now_microseconds();
        let profile = CreatorProfile {
            creator: creator_address,
            display_name: copy display_name,
            bio: copy bio,
            avatar_blob_name: copy avatar_blob_name,
            links_blob_name: copy links_blob_name,
            updated_at_micros: now,
        };

        if (table::contains(&registry.creator_profiles, creator_address)) {
            let current = table::borrow_mut(&mut registry.creator_profiles, creator_address);
            current.display_name = profile.display_name;
            current.bio = profile.bio;
            current.avatar_blob_name = profile.avatar_blob_name;
            current.links_blob_name = profile.links_blob_name;
            current.updated_at_micros = profile.updated_at_micros;
        } else {
            table::add(&mut registry.creator_profiles, creator_address, profile);
        };

        event::emit(CreatorProfileUpdated {
            creator: creator_address,
            display_name,
            bio,
            avatar_blob_name,
            links_blob_name,
            updated_at_micros: now,
        });
    }

    public entry fun register_space(
        creator: &signer,
        registry_address: address,
        space_id: String,
        network: String,
        manifest_blob_name: String,
        manifest_hash: vector<u8>,
        manifest_version: u64,
        visibility: u8,
        access_rule: u8,
        price_octas: u64,
        payment_currency: u8,
        payment_asset: address,
        allowlist: vector<address>,
    ) acquires Registry {
        assert!(exists<Registry>(registry_address), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_address);
        assert!(!table::contains(&registry.spaces, space_id), E_SPACE_EXISTS);

        let creator_address = signer::address_of(creator);
        let now = timestamp::now_microseconds();
        let record = SpaceRecord {
            space_id,
            creator: creator_address,
            network,
            manifest_blob_name,
            manifest_hash,
            manifest_version,
            visibility,
            access_rule,
            price_octas,
            payment_currency,
            payment_asset,
            created_at_micros: now,
            updated_at_micros: now,
        };

        let event_space_id = record.space_id;
        let event_network = record.network;
        let event_manifest_blob_name = record.manifest_blob_name;
        let event_manifest_hash = record.manifest_hash;

        table::add(&mut registry.spaces, record.space_id, record);
        vector::push_back(&mut registry.space_ids, event_space_id);

        if (!table::contains(&registry.creator_spaces, creator_address)) {
            table::add(&mut registry.creator_spaces, creator_address, vector::empty<String>());
        };
        let creator_space_ids = table::borrow_mut(&mut registry.creator_spaces, creator_address);
        vector::push_back(creator_space_ids, event_space_id);

        if (!vector::is_empty(&allowlist)) {
            table::add(&mut registry.allowlists, event_space_id, allowlist);
        };

        event::emit(SpaceRegistered {
            space_id: event_space_id,
            creator: creator_address,
            network: event_network,
            manifest_blob_name: event_manifest_blob_name,
            manifest_hash: event_manifest_hash,
            manifest_version,
            visibility,
            access_rule,
            price_octas,
            payment_currency,
            payment_asset,
            created_at_micros: now,
        });
    }

    public entry fun update_manifest(
        creator: &signer,
        registry_address: address,
        space_id: String,
        manifest_blob_name: String,
        manifest_hash: vector<u8>,
        manifest_version: u64,
    ) acquires Registry {
        assert!(exists<Registry>(registry_address), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_address);
        assert!(table::contains(&registry.spaces, space_id), E_SPACE_NOT_FOUND);

        let record = table::borrow_mut(&mut registry.spaces, space_id);
        let creator_address = signer::address_of(creator);
        assert!(record.creator == creator_address, E_NOT_CREATOR);

        let now = timestamp::now_microseconds();
        record.manifest_blob_name = manifest_blob_name;
        record.manifest_hash = manifest_hash;
        record.manifest_version = manifest_version;
        record.updated_at_micros = now;

        event::emit(SpaceUpdated {
            space_id,
            creator: creator_address,
            manifest_blob_name,
            manifest_hash,
            manifest_version,
            updated_at_micros: now,
        });
    }

    public entry fun add_to_allowlist(
        creator: &signer,
        registry_address: address,
        space_id: String,
        wallet: address,
    ) acquires Registry {
        assert!(exists<Registry>(registry_address), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_address);
        assert!(table::contains(&registry.spaces, space_id), E_SPACE_NOT_FOUND);
        let record = table::borrow(&registry.spaces, space_id);
        assert!(record.creator == signer::address_of(creator), E_NOT_CREATOR);

        if (!table::contains(&registry.allowlists, space_id)) {
            table::add(&mut registry.allowlists, space_id, vector::empty<address>());
        };

        let wallets = table::borrow_mut(&mut registry.allowlists, space_id);
        if (!contains_address(wallets, wallet)) {
            vector::push_back(wallets, wallet);
        };
    }

    public entry fun purchase_space(
        buyer: &signer,
        registry_address: address,
        space_id: String,
    ) acquires Registry {
        assert!(exists<Registry>(registry_address), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_address);
        assert!(table::contains(&registry.spaces, space_id), E_SPACE_NOT_FOUND);

        let record = table::borrow(&registry.spaces, space_id);
        assert!(
            record.visibility == VISIBILITY_PAID &&
            record.price_octas > 0 &&
            record.payment_currency == PAYMENT_APT,
            E_NOT_PAID_SPACE
        );
        let buyer_address = signer::address_of(buyer);

        if (!table::contains(&registry.purchases, space_id)) {
            table::add(&mut registry.purchases, space_id, vector::empty<address>());
        };

        let buyers = table::borrow_mut(&mut registry.purchases, space_id);
        assert!(!contains_address(buyers, buyer_address), E_ALREADY_PURCHASED);

        coin::transfer<AptosCoin>(buyer, record.creator, record.price_octas);
        vector::push_back(buyers, buyer_address);

        event::emit(SpacePurchased {
            space_id,
            creator: record.creator,
            buyer: buyer_address,
            price_octas: record.price_octas,
            payment_currency: record.payment_currency,
            payment_asset: record.payment_asset,
            purchased_at_micros: timestamp::now_microseconds(),
        });
    }

    public entry fun purchase_space_shelby_usd(
        buyer: &signer,
        registry_address: address,
        space_id: String,
        payment_asset: Object<Metadata>,
    ) acquires Registry {
        assert!(exists<Registry>(registry_address), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_address);
        assert!(table::contains(&registry.spaces, space_id), E_SPACE_NOT_FOUND);

        let record = table::borrow(&registry.spaces, space_id);
        assert!(
            record.visibility == VISIBILITY_PAID &&
            record.price_octas > 0 &&
            record.payment_currency == PAYMENT_SHELBY_USD &&
            record.payment_asset == object::object_address(&payment_asset),
            E_NOT_PAID_SPACE
        );
        let buyer_address = signer::address_of(buyer);

        if (!table::contains(&registry.purchases, space_id)) {
            table::add(&mut registry.purchases, space_id, vector::empty<address>());
        };

        let buyers = table::borrow_mut(&mut registry.purchases, space_id);
        assert!(!contains_address(buyers, buyer_address), E_ALREADY_PURCHASED);

        primary_fungible_store::transfer(buyer, payment_asset, record.creator, record.price_octas);
        vector::push_back(buyers, buyer_address);

        event::emit(SpacePurchased {
            space_id,
            creator: record.creator,
            buyer: buyer_address,
            price_octas: record.price_octas,
            payment_currency: record.payment_currency,
            payment_asset: record.payment_asset,
            purchased_at_micros: timestamp::now_microseconds(),
        });
    }

    #[view]
    public fun has_purchase(
        registry_address: address,
        space_id: String,
        buyer: address,
    ): bool acquires Registry {
        if (!exists<Registry>(registry_address)) return false;
        let registry = borrow_global<Registry>(registry_address);
        if (!table::contains(&registry.purchases, space_id)) return false;

        contains_address(table::borrow(&registry.purchases, space_id), buyer)
    }

    #[view]
    public fun is_allowlisted(
        registry_address: address,
        space_id: String,
        wallet: address,
    ): bool acquires Registry {
        if (!exists<Registry>(registry_address)) return false;
        let registry = borrow_global<Registry>(registry_address);
        if (!table::contains(&registry.allowlists, space_id)) return false;

        contains_address(table::borrow(&registry.allowlists, space_id), wallet)
    }

    fun contains_address(wallets: &vector<address>, wallet: address): bool {
        let index = 0;
        let length = vector::length(wallets);

        while (index < length) {
            if (*vector::borrow(wallets, index) == wallet) {
                return true
            };
            index = index + 1;
        };

        false
    }
}
